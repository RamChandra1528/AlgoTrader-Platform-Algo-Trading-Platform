from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.backtest import Backtest
from app.models.position import Position
from app.models.service_status import ServiceStatus
from app.models.strategy import Strategy
from app.models.trade import Trade
from app.models.user import User
from app.schemas.admin import (
    AdminDashboardSummary,
    AdminUserSummary,
    AdminUserUpdate,
    AuditLogResponse,
    ForceCloseRequest,
    PlatformControlState,
    PlatformRiskSettings,
    ResetBalanceRequest,
    StrategyAdminUpdate,
    ToggleRequest,
    TradeOverrideRequest,
)
from app.schemas.strategy import StrategyResponse
from app.schemas.trade import TradeExecute, TradeResponse
from app.services.account import build_account_snapshot
from app.services.admin import (
    broadcast_system_state,
    calculate_platform_metrics,
    emit_admin_monitor_payload,
    ensure_service_statuses,
    get_platform_settings,
    log_audit_event,
)
from app.services.live_autotrader import stop
from app.services.trading_engine import close_all_positions_for_user, execute_trade_for_user

router = APIRouter()


@router.get("/summary", response_model=AdminDashboardSummary)
def get_admin_summary(
    db: Session = Depends(get_db), admin_user: User = Depends(require_admin)
):
    platform = get_platform_settings(db)
    services = ensure_service_statuses(db)
    metrics = calculate_platform_metrics(db)
    system_status = "running" if platform.system_running else "stopped"
    return {
        **metrics,
        "system_status": system_status,
        "trading_enabled": platform.trading_enabled,
        "market_data_enabled": platform.market_data_enabled,
        "services": services,
    }


@router.get("/users", response_model=List[AdminUserSummary])
def list_users(db: Session = Depends(get_db), admin_user: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    trade_counts = {
        user_id: total
        for user_id, total in db.query(Trade.user_id, func.count(Trade.id)).group_by(Trade.user_id).all()
    }
    open_positions = {
        user_id: total
        for user_id, total in db.query(Position.user_id, func.count(Position.id)).group_by(Position.user_id).all()
    }
    return [
        AdminUserSummary(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            is_trading_enabled=user.is_trading_enabled,
            created_at=user.created_at,
            starting_balance=float(user.starting_balance),
            cash_balance=float(user.cash_balance),
            max_trade_amount=float(user.max_trade_amount),
            daily_loss_limit=float(user.daily_loss_limit),
            max_trades_per_day=int(user.max_trades_per_day),
            last_login_at=user.last_login_at,
            total_trades=int(trade_counts.get(user.id, 0)),
            open_positions=int(open_positions.get(user.id, 0)),
        )
        for user in users
    ]


@router.patch("/users/{user_id}", response_model=AdminUserSummary)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin_user.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Admin cannot deactivate own account")

    if payload.role is not None and payload.role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")

    for field in (
        "is_active",
        "is_trading_enabled",
        "role",
        "max_trade_amount",
        "daily_loss_limit",
        "max_trades_per_day",
    ):
        value = getattr(payload, field)
        if value is not None:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    log_audit_event(
        db,
        action="user_updated",
        entity_type="user",
        actor_user_id=admin_user.id,
        target_user_id=user.id,
        entity_id=str(user.id),
        details=payload.dict(exclude_none=True),
    )
    emit_admin_monitor_payload(
        category="user",
        action="updated",
        message=f"Admin updated user {user.email}",
        user_id=user.id,
        meta=payload.dict(exclude_none=True),
    )
    return AdminUserSummary(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_trading_enabled=user.is_trading_enabled,
        created_at=user.created_at,
        starting_balance=float(user.starting_balance),
        cash_balance=float(user.cash_balance),
        max_trade_amount=float(user.max_trade_amount),
        daily_loss_limit=float(user.daily_loss_limit),
        max_trades_per_day=int(user.max_trades_per_day),
        last_login_at=user.last_login_at,
        total_trades=db.query(func.count(Trade.id)).filter(Trade.user_id == user.id).scalar() or 0,
        open_positions=db.query(func.count(Position.id)).filter(Position.user_id == user.id).scalar() or 0,
    )


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Admin cannot delete own account")

    stop(user.id)
    db.query(Position).filter(Position.user_id == user.id).delete()
    db.query(Trade).filter(Trade.user_id == user.id).delete()
    db.query(Backtest).filter(Backtest.user_id == user.id).delete()
    db.query(Strategy).filter(Strategy.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    log_audit_event(
        db,
        action="user_deleted",
        entity_type="user",
        actor_user_id=admin_user.id,
        target_user_id=user_id,
        entity_id=str(user_id),
        severity="warning",
        details={"email": user.email},
    )


@router.post("/users/{user_id}/reset-balance", response_model=AdminUserSummary)
def reset_user_balance(
    user_id: int,
    payload: ResetBalanceRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.starting_balance = payload.new_balance
    user.cash_balance = payload.new_balance
    db.query(Position).filter(Position.user_id == user.id).delete()
    db.commit()
    db.refresh(user)
    log_audit_event(
        db,
        action="balance_reset",
        entity_type="user",
        actor_user_id=admin_user.id,
        target_user_id=user.id,
        entity_id=str(user.id),
        details={"new_balance": payload.new_balance},
    )
    emit_admin_monitor_payload(
        category="user",
        action="balance_reset",
        message=f"Balance reset for user {user.email}",
        user_id=user.id,
        value=payload.new_balance,
    )
    return AdminUserSummary(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_trading_enabled=user.is_trading_enabled,
        created_at=user.created_at,
        starting_balance=float(user.starting_balance),
        cash_balance=float(user.cash_balance),
        max_trade_amount=float(user.max_trade_amount),
        daily_loss_limit=float(user.daily_loss_limit),
        max_trades_per_day=int(user.max_trades_per_day),
        last_login_at=user.last_login_at,
        total_trades=db.query(func.count(Trade.id)).filter(Trade.user_id == user.id).scalar() or 0,
        open_positions=0,
    )


@router.get("/users/{user_id}/portfolio")
def get_user_portfolio(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    snapshot = build_account_snapshot(db, user)
    return snapshot


@router.get("/users/{user_id}/trades", response_model=List[TradeResponse])
def get_user_trades(
    user_id: int,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return (
        db.query(Trade)
        .filter(Trade.user_id == user_id)
        .order_by(Trade.executed_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/trading/global")
def set_global_trading_state(
    payload: ToggleRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    platform = get_platform_settings(db)
    platform.trading_enabled = payload.enabled
    platform.system_running = payload.enabled or platform.system_running
    db.commit()
    log_audit_event(
        db,
        action="global_trading_toggled",
        entity_type="system",
        actor_user_id=admin_user.id,
        entity_id="platform",
        details={"enabled": payload.enabled},
    )
    broadcast_system_state(db)
    emit_admin_monitor_payload(
        category="system",
        action="global_trading_toggled",
        message=f"Global trading {'enabled' if payload.enabled else 'paused'} by admin",
        meta={"enabled": payload.enabled},
    )
    return {"status": "ok", "trading_enabled": platform.trading_enabled}


@router.post("/trading/users/{user_id}/pause")
def pause_user_trading(
    user_id: int,
    payload: ToggleRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_trading_enabled = payload.enabled
    db.commit()
    log_audit_event(
        db,
        action="user_trading_toggled",
        entity_type="user",
        actor_user_id=admin_user.id,
        target_user_id=user.id,
        entity_id=str(user.id),
        details={"is_trading_enabled": payload.enabled},
    )
    return {"status": "ok", "user_id": user.id, "is_trading_enabled": user.is_trading_enabled}


@router.post("/trading/force-close")
def force_close_positions(
    payload: ForceCloseRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    users = (
        [db.query(User).filter(User.id == payload.user_id).first()]
        if payload.user_id
        else db.query(User).filter(User.is_active == True).all()
    )
    users = [user for user in users if user is not None]
    if not users:
        raise HTTPException(status_code=404, detail="No users available for force close")

    closed_positions = 0
    for user in users:
        closed_positions += close_all_positions_for_user(
            db,
            user,
            source="forced_exit",
            notes=f"Force closed by admin {admin_user.id}",
        )

    log_audit_event(
        db,
        action="force_close_positions",
        entity_type="trade",
        actor_user_id=admin_user.id,
        entity_id="all" if payload.user_id is None else str(payload.user_id),
        severity="warning",
        details={"closed_positions": closed_positions, "target_user_id": payload.user_id},
    )
    emit_admin_monitor_payload(
        category="trade",
        action="force_close",
        message=f"Admin force-closed {closed_positions} open positions",
        user_id=payload.user_id,
        value=float(closed_positions),
    )
    return {"status": "ok", "closed_positions": closed_positions}


@router.post("/trading/override-signal", response_model=TradeResponse)
def override_signal(
    payload: TradeOverrideRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    trade = execute_trade_for_user(
        db,
        user,
        TradeExecute(
            symbol=payload.symbol,
            side=payload.side,
            quantity=payload.quantity,
            strategy_id=payload.strategy_id,
        ),
        source="admin_override",
        notes=payload.note or f"Admin override by {admin_user.email}",
        allow_admin_override=True,
    )
    log_audit_event(
        db,
        action="signal_override",
        entity_type="trade",
        actor_user_id=admin_user.id,
        target_user_id=user.id,
        entity_id=str(trade.id),
        severity="warning",
        details={
            "symbol": payload.symbol,
            "side": payload.side,
            "quantity": payload.quantity,
            "note": payload.note,
        },
    )
    return trade


@router.get("/strategies", response_model=List[StrategyResponse])
def list_all_strategies(
    db: Session = Depends(get_db), admin_user: User = Depends(require_admin)
):
    return db.query(Strategy).order_by(Strategy.created_at.desc()).all()


@router.patch("/strategies/{strategy_id}", response_model=StrategyResponse)
def update_strategy_as_admin(
    strategy_id: int,
    payload: StrategyAdminUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if strategy is None:
        raise HTTPException(status_code=404, detail="Strategy not found")
    strategy.parameters = payload.parameters
    if payload.is_active is not None:
        strategy.is_active = payload.is_active
    db.commit()
    db.refresh(strategy)
    log_audit_event(
        db,
        action="strategy_updated_by_admin",
        entity_type="strategy",
        actor_user_id=admin_user.id,
        target_user_id=strategy.user_id,
        entity_id=str(strategy.id),
        details={"parameters": payload.parameters, "is_active": payload.is_active},
    )
    emit_admin_monitor_payload(
        category="strategy",
        action="updated",
        message=f"Admin updated strategy {strategy.name}",
        user_id=strategy.user_id,
        meta={"strategy_id": strategy.id},
    )
    return strategy


@router.get("/risk", response_model=PlatformControlState)
def get_risk_settings(
    db: Session = Depends(get_db), admin_user: User = Depends(require_admin)
):
    platform = get_platform_settings(db)
    return platform


@router.put("/risk", response_model=PlatformControlState)
def update_risk_settings(
    payload: PlatformRiskSettings,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    platform = get_platform_settings(db)
    platform.global_stop_loss_limit = payload.global_stop_loss_limit
    platform.default_max_trade_amount = payload.default_max_trade_amount
    platform.default_daily_loss_limit = payload.default_daily_loss_limit
    platform.default_max_trades_per_day = payload.default_max_trades_per_day
    db.commit()
    db.refresh(platform)
    log_audit_event(
        db,
        action="risk_settings_updated",
        entity_type="risk",
        actor_user_id=admin_user.id,
        entity_id="platform",
        details=payload.dict(),
    )
    broadcast_system_state(db)
    return platform


@router.get("/system/status")
def get_system_status(
    db: Session = Depends(get_db), admin_user: User = Depends(require_admin)
):
    platform = get_platform_settings(db)
    services = ensure_service_statuses(db)
    return {
        "system_running": platform.system_running,
        "trading_enabled": platform.trading_enabled,
        "market_data_enabled": platform.market_data_enabled,
        "services": services,
        "timestamp": int(datetime.utcnow().timestamp() * 1000),
    }


@router.post("/system/run")
def toggle_system_runtime(
    payload: ToggleRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    platform = get_platform_settings(db)
    platform.system_running = payload.enabled
    db.commit()
    log_audit_event(
        db,
        action="system_runtime_toggled",
        entity_type="system",
        actor_user_id=admin_user.id,
        entity_id="platform",
        details={"system_running": payload.enabled},
    )
    broadcast_system_state(db)
    return {"status": "ok", "system_running": platform.system_running}


@router.post("/system/market-data")
def toggle_market_data(
    payload: ToggleRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    platform = get_platform_settings(db)
    platform.market_data_enabled = payload.enabled
    db.commit()
    log_audit_event(
        db,
        action="market_data_toggled",
        entity_type="service",
        actor_user_id=admin_user.id,
        entity_id="market_data",
        details={"market_data_enabled": payload.enabled},
    )
    broadcast_system_state(db)
    return {"status": "ok", "market_data_enabled": platform.market_data_enabled}


@router.post("/system/restart/{service_name}")
def restart_service(
    service_name: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    service = db.query(ServiceStatus).filter(ServiceStatus.service_name == service_name).first()
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    now = datetime.utcnow()
    service.status = "running"
    service.message = "Restart command executed by admin"
    service.last_restart_at = now
    service.last_heartbeat = now
    db.commit()
    db.refresh(service)
    log_audit_event(
        db,
        action="service_restarted",
        entity_type="service",
        actor_user_id=admin_user.id,
        entity_id=service_name,
        details={"service_name": service_name},
    )
    broadcast_system_state(db)
    return {"status": "ok", "service_name": service_name, "service_status": service.status}


@router.get("/logs/audit", response_model=List[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(default=100, le=500),
    entity_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
):
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()

