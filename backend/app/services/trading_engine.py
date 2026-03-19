from __future__ import annotations

from datetime import datetime
from typing import Optional

import anyio
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.websocket import emit_account_update, emit_admin_event, emit_trade_notification
from app.models.platform_setting import PlatformSetting
from app.models.position import Position
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trade import TradeExecute
from app.services.account import build_account_snapshot
from app.services.admin import get_platform_settings
from app.services.market_data import get_current_price


def execute_trade_for_user(
    db: Session,
    user: User,
    payload: TradeExecute,
    *,
    source: str = "manual",
    notes: str | None = None,
    allow_admin_override: bool = False,
) -> Trade:
    symbol = payload.symbol.upper()
    side = payload.side.lower()
    if side not in {"buy", "sell"}:
        raise HTTPException(status_code=400, detail="Invalid side (must be buy/sell)")

    platform = get_platform_settings(db)
    price = get_current_price(symbol)
    if not platform.market_data_enabled:
        raise HTTPException(status_code=423, detail="Market data feed is disabled by admin")
    if price is None:
        raise HTTPException(status_code=400, detail="Could not fetch price")

    _validate_trading_access(
        db,
        user,
        platform,
        side=side,
        quantity=float(payload.quantity),
        price=float(price),
        allow_admin_override=allow_admin_override,
    )

    pnl = 0.0
    position = (
        db.query(Position)
        .filter(Position.user_id == user.id, Position.symbol == symbol)
        .first()
    )

    if side == "sell":
        if not position or position.quantity < payload.quantity:
            raise HTTPException(status_code=400, detail="Insufficient position")
        pnl = (price - position.avg_price) * payload.quantity
    else:
        cost = price * payload.quantity
        if float(user.cash_balance) < cost:
            raise HTTPException(status_code=400, detail="Insufficient cash balance")

    trade = Trade(
        user_id=user.id,
        strategy_id=payload.strategy_id,
        symbol=symbol,
        side=side,
        quantity=payload.quantity,
        price=price,
        pnl=round(pnl, 2),
        is_paper=True,
        source=source,
        notes=notes,
    )
    db.add(trade)

    if side == "buy":
        user.cash_balance = float(user.cash_balance) - (price * payload.quantity)
        if position:
            total_qty = position.quantity + payload.quantity
            position.avg_price = (
                (position.avg_price * position.quantity) + (price * payload.quantity)
            ) / total_qty
            position.quantity = total_qty
            position.current_price = price
            position.unrealized_pnl = round((price - position.avg_price) * position.quantity, 2)
        else:
            position = Position(
                user_id=user.id,
                symbol=symbol,
                quantity=payload.quantity,
                avg_price=price,
                current_price=price,
                unrealized_pnl=0.0,
            )
            db.add(position)
    else:
        user.cash_balance = float(user.cash_balance) + (price * payload.quantity)
        position.quantity -= payload.quantity
        if position.quantity <= 0:
            db.delete(position)
        else:
            position.current_price = price
            position.unrealized_pnl = round((price - position.avg_price) * position.quantity, 2)

    db.commit()
    db.refresh(trade)
    _emit_trade_events(db, user, trade)
    return trade


def close_all_positions_for_user(
    db: Session,
    user: User,
    *,
    source: str = "forced_exit",
    notes: str | None = None,
) -> int:
    positions = db.query(Position).filter(Position.user_id == user.id).all()
    closed = 0
    for position in list(positions):
        execute_trade_for_user(
            db,
            user,
            TradeExecute(symbol=position.symbol, side="sell", quantity=position.quantity),
            source=source,
            notes=notes,
            allow_admin_override=True,
        )
        closed += 1
    return closed


def _validate_trading_access(
    db: Session,
    user: User,
    platform: PlatformSetting,
    *,
    side: str,
    quantity: float,
    price: float,
    allow_admin_override: bool,
) -> None:
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    if side == "sell":
        return

    if not platform.system_running and not allow_admin_override:
        raise HTTPException(status_code=423, detail="System is stopped by admin")
    if not platform.trading_enabled and not allow_admin_override:
        raise HTTPException(status_code=423, detail="Global trading is paused by admin")
    if not user.is_trading_enabled and not allow_admin_override:
        raise HTTPException(status_code=423, detail="Trading is paused for this user")

    trade_value = quantity * price
    if user.max_trade_amount and trade_value > float(user.max_trade_amount) and not allow_admin_override:
        raise HTTPException(
            status_code=400,
            detail=f"Trade amount exceeds user limit of ${float(user.max_trade_amount):.2f}",
        )

    today = datetime.utcnow().date()
    today_trade_count = (
        db.query(func.count(Trade.id))
        .filter(Trade.user_id == user.id, func.date(Trade.executed_at) == today.isoformat())
        .scalar()
        or 0
    )
    if user.max_trades_per_day and today_trade_count >= int(user.max_trades_per_day) and not allow_admin_override:
        raise HTTPException(status_code=400, detail="Daily trade limit reached for user")

    today_realized_pnl = (
        db.query(func.coalesce(func.sum(Trade.pnl), 0.0))
        .filter(Trade.user_id == user.id, func.date(Trade.executed_at) == today.isoformat())
        .scalar()
        or 0.0
    )
    if user.daily_loss_limit and float(today_realized_pnl) <= -float(user.daily_loss_limit) and not allow_admin_override:
        raise HTTPException(status_code=400, detail="Daily loss limit reached for user")

    platform_realized_pnl = db.query(func.coalesce(func.sum(Trade.pnl), 0.0)).scalar() or 0.0
    if (
        platform.global_stop_loss_limit
        and float(platform_realized_pnl) <= -float(platform.global_stop_loss_limit)
        and not allow_admin_override
    ):
        platform.trading_enabled = False
        db.commit()
        raise HTTPException(status_code=423, detail="Global stop-loss limit reached; trading halted")


def _emit_trade_events(db: Session, user: User, trade: Trade) -> None:
    snapshot = build_account_snapshot(db, user)
    last_trade = {
        "id": trade.id,
        "symbol": trade.symbol,
        "side": trade.side,
        "quantity": trade.quantity,
        "price": round(trade.price, 2),
        "pnl": round(trade.pnl, 2),
        "executed_at": trade.executed_at.isoformat(),
        "source": trade.source,
        "notes": trade.notes,
    }
    snapshot["last_trade"] = last_trade
    snapshot["timestamp"] = int(datetime.utcnow().timestamp() * 1000)

    trade_notification = {
        "id": trade.id,
        "symbol": trade.symbol,
        "side": trade.side,
        "quantity": trade.quantity,
        "price": round(trade.price, 2),
        "status": "filled",
        "source": trade.source,
        "notes": trade.notes,
        "timestamp": snapshot["timestamp"],
    }
    admin_event = {
        "category": "trade",
        "action": trade.source,
        "message": f"{trade.side.upper()} {trade.symbol} x {trade.quantity} for user {user.id}",
        "user_id": user.id,
        "symbol": trade.symbol,
        "value": round(trade.pnl, 2),
        "meta": {
            "trade_id": trade.id,
            "price": round(trade.price, 2),
            "source": trade.source,
        },
        "timestamp": snapshot["timestamp"],
    }

    _dispatch_async(emit_account_update, user.id, snapshot)
    _dispatch_async(emit_trade_notification, user.id, trade_notification)
    _dispatch_async(emit_admin_event, admin_event)


def _dispatch_async(fn, *args) -> None:
    try:
        import asyncio

        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(fn(*args))
            return
    except RuntimeError:
        pass

    try:
        anyio.from_thread.run(fn, *args)
    except Exception:
        pass
