from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.position import Position
from app.models.user import User
from app.schemas.trade import TradeExecute
from app.services.auto_trader import screen_market
from app.services.market_data import get_current_price
from app.api.trading import execute_trade
from app.api.websocket import emit_bot_log

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AutoTradeConfig:
    profit_target_pct: float = 0.03  # +3%
    stop_loss_pct: float = 0.02      # -2%
    budget_per_trade: float = 2000.0
    max_positions: int = 5
    loop_interval_sec: float = 10.0


_tasks: Dict[int, asyncio.Task] = {}
_configs: Dict[int, AutoTradeConfig] = {}


def is_running(user_id: int) -> bool:
    t = _tasks.get(user_id)
    return bool(t and not t.done())


def stop(user_id: int) -> None:
    t = _tasks.get(user_id)
    if t and not t.done():
        t.cancel()
    _tasks.pop(user_id, None)
    _configs.pop(user_id, None)


def start(user_id: int, config: AutoTradeConfig) -> None:
    if is_running(user_id):
        _configs[user_id] = config
        return
    _configs[user_id] = config
    _tasks[user_id] = asyncio.create_task(_runner(user_id))


async def _runner(user_id: int) -> None:
    logger.info(f"AutoTrader started for user={user_id}")
    try:
        while True:
            cfg = _configs.get(user_id) or AutoTradeConfig()
            try:
                await emit_bot_log(
                    user_id,
                    {"level": "info", "event": "tick_start", "message": "Tick started"},
                )
                _tick(user_id, cfg)
                await emit_bot_log(
                    user_id,
                    {"level": "info", "event": "tick_end", "message": "Tick completed"},
                )
            except Exception as e:
                logger.error(f"AutoTrader tick error user={user_id}: {e}")
                await emit_bot_log(
                    user_id,
                    {
                        "level": "error",
                        "event": "tick_error",
                        "message": f"Tick error: {e}",
                    },
                )
            await asyncio.sleep(cfg.loop_interval_sec)
    except asyncio.CancelledError:
        logger.info(f"AutoTrader stopped for user={user_id}")
        try:
            await emit_bot_log(
                user_id,
                {"level": "warning", "event": "stopped", "message": "Live auto-trader stopped"},
            )
        except Exception:
            pass
        raise


def _tick(user_id: int, cfg: AutoTradeConfig) -> None:
    db: Optional[Session] = None
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            stop(user_id)
            return

        # 1) Risk management: profit target / stop loss on open positions
        positions = db.query(Position).filter(Position.user_id == user_id).all()
        for pos in positions:
            price = get_current_price(pos.symbol)
            if not price:
                continue
            change_pct = (price - pos.avg_price) / max(pos.avg_price, 1e-9)
            if change_pct >= cfg.profit_target_pct or change_pct <= -cfg.stop_loss_pct:
                reason = (
                    "profit_target"
                    if change_pct >= cfg.profit_target_pct
                    else "stop_loss"
                )
                asyncio.create_task(
                    emit_bot_log(
                        user_id,
                        {
                            "level": "info",
                            "event": "exit_signal",
                            "symbol": pos.symbol,
                            "message": f"Exit signal for {pos.symbol}: {reason} ({change_pct*100:.2f}%)",
                        },
                    )
                )
                execute_trade(
                    TradeExecute(symbol=pos.symbol, side="sell", quantity=pos.quantity),
                    db,
                    user,
                )

        # 2) Entry logic: buy on bullish signals (MA crossover / RSI) from scanner
        positions = db.query(Position).filter(Position.user_id == user_id).all()
        if len(positions) >= cfg.max_positions:
            return

        recs = screen_market()
        buy_recs = [r for r in recs if r.get("signal") == "BUY" and r.get("confidence", 0) >= 60]
        if not buy_recs:
            return

        # Buy best candidate not already owned
        owned = {p.symbol for p in positions}
        pick = next((r for r in buy_recs if r["symbol"] not in owned), None)
        if not pick:
            return

        price = float(pick["current_price"])
        if price <= 0:
            return

        budget = min(float(user.cash_balance), cfg.budget_per_trade)
        qty = int(budget // price)
        if qty <= 0:
            return

        asyncio.create_task(
            emit_bot_log(
                user_id,
                {
                    "level": "info",
                    "event": "entry_signal",
                    "symbol": pick["symbol"],
                    "message": f"Entry signal BUY {pick['symbol']} (confidence {pick.get('confidence')}%)",
                },
            )
        )
        execute_trade(
            TradeExecute(symbol=pick["symbol"], side="buy", quantity=qty),
            db,
            user,
        )
    finally:
        if db is not None:
            db.close()

