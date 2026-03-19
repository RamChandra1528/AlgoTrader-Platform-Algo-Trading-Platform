from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List

import anyio
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.websocket import emit_admin_event, emit_audit_event, emit_system_status
from app.config import settings
from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.platform_setting import PlatformSetting
from app.models.position import Position
from app.models.service_status import ServiceStatus
from app.models.trade import Trade
from app.models.user import User
from app.services.market_data import get_current_price

DEFAULT_SERVICE_NAMES = ("api", "websocket", "market_data", "autotrader")


def get_platform_settings(db: Session) -> PlatformSetting:
    settings_row = (
        db.query(PlatformSetting)
        .filter(PlatformSetting.singleton_key == "default")
        .first()
    )
    if settings_row is None:
        settings_row = PlatformSetting(singleton_key="default")
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return settings_row


def ensure_service_statuses(db: Session) -> List[ServiceStatus]:
    existing = {s.service_name: s for s in db.query(ServiceStatus).all()}
    changed = False
    for name in DEFAULT_SERVICE_NAMES:
        if name not in existing:
            db.add(ServiceStatus(service_name=name, status="running", message="Service operational"))
            changed = True
    if changed:
        db.commit()
    return db.query(ServiceStatus).order_by(ServiceStatus.service_name.asc()).all()


def seed_admin_user(db: Session) -> None:
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        return
    admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
    if admin is None:
        platform = get_platform_settings(db)
        admin = User(
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            full_name=settings.ADMIN_FULL_NAME,
            role="admin",
            starting_balance=100000.0,
            cash_balance=100000.0,
            max_trade_amount=platform.default_max_trade_amount,
            daily_loss_limit=platform.default_daily_loss_limit,
            max_trades_per_day=platform.default_max_trades_per_day,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    elif admin.role != "admin":
        admin.role = "admin"
        db.commit()


def bootstrap_admin_system(db: Session) -> None:
    get_platform_settings(db)
    ensure_service_statuses(db)
    seed_admin_user(db)


def serialize_service_statuses(services: Iterable[ServiceStatus]) -> List[Dict[str, Any]]:
    return [
        {
            "service_name": service.service_name,
            "status": service.status,
            "message": service.message,
            "last_heartbeat": service.last_heartbeat,
            "last_restart_at": service.last_restart_at,
            "updated_at": service.updated_at,
        }
        for service in services
    ]


def log_audit_event(
    db: Session,
    *,
    action: str,
    entity_type: str,
    actor_user_id: int | None = None,
    target_user_id: int | None = None,
    entity_id: str | None = None,
    severity: str = "info",
    details: Dict[str, Any] | None = None,
) -> AuditLog:
    audit = AuditLog(
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        severity=severity,
        details=details or {},
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    _dispatch_async(
        emit_audit_event,
        {
            "id": audit.id,
            "actor_user_id": audit.actor_user_id,
            "target_user_id": audit.target_user_id,
            "action": audit.action,
            "entity_type": audit.entity_type,
            "entity_id": audit.entity_id,
            "severity": audit.severity,
            "details": audit.details,
            "created_at": audit.created_at.isoformat(),
        },
    )
    return audit


def emit_admin_monitor_payload(
    *,
    category: str,
    action: str,
    message: str,
    user_id: int | None = None,
    symbol: str | None = None,
    value: float | None = None,
    meta: Dict[str, Any] | None = None,
) -> None:
    _dispatch_async(
        emit_admin_event,
        {
            "category": category,
            "action": action,
            "message": message,
            "user_id": user_id,
            "symbol": symbol,
            "value": value,
            "meta": meta or {},
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
        },
    )


def broadcast_system_state(db: Session) -> None:
    settings_row = get_platform_settings(db)
    services = ensure_service_statuses(db)
    payload = {
        "system_running": settings_row.system_running,
        "trading_enabled": settings_row.trading_enabled,
        "market_data_enabled": settings_row.market_data_enabled,
        "global_stop_loss_limit": settings_row.global_stop_loss_limit,
        "default_max_trade_amount": settings_row.default_max_trade_amount,
        "default_daily_loss_limit": settings_row.default_daily_loss_limit,
        "default_max_trades_per_day": settings_row.default_max_trades_per_day,
        "services": [
            {
                "service_name": service.service_name,
                "status": service.status,
                "message": service.message,
                "last_heartbeat": service.last_heartbeat.isoformat() if service.last_heartbeat else None,
                "last_restart_at": service.last_restart_at.isoformat() if service.last_restart_at else None,
                "updated_at": service.updated_at.isoformat() if service.updated_at else None,
            }
            for service in services
        ],
        "timestamp": int(datetime.utcnow().timestamp() * 1000),
    }
    _dispatch_async(emit_system_status, payload)


def calculate_platform_metrics(db: Session) -> Dict[str, Any]:
    users = db.query(User).all()
    total_users = len(users)
    total_trades_executed = db.query(func.count(Trade.id)).scalar() or 0
    realized_pnl = db.query(func.coalesce(func.sum(Trade.pnl), 0.0)).scalar() or 0.0

    unrealized_pnl = 0.0
    market_value = 0.0
    total_cash = sum(float(user.cash_balance) for user in users)
    active_user_ids = set()
    since = datetime.utcnow() - timedelta(hours=24)

    recent_traders = db.query(Trade.user_id).filter(Trade.executed_at >= since).distinct().all()
    active_user_ids.update(row[0] for row in recent_traders if row[0] is not None)

    positions = db.query(Position).all()
    for position in positions:
        current_price = get_current_price(position.symbol) or float(position.current_price or 0.0)
        position.current_price = current_price
        position.unrealized_pnl = round((current_price - position.avg_price) * position.quantity, 2)
        unrealized_pnl += position.unrealized_pnl
        market_value += current_price * position.quantity
        active_user_ids.add(position.user_id)
    db.commit()

    platform_equity = round(total_cash + market_value, 2)

    return {
        "total_users": total_users,
        "active_traders": len(active_user_ids),
        "total_trades_executed": int(total_trades_executed),
        "platform_realized_pnl": round(float(realized_pnl), 2),
        "platform_unrealized_pnl": round(float(unrealized_pnl), 2),
        "platform_equity": platform_equity,
    }


def _dispatch_async(fn, payload: Dict[str, Any]) -> None:
    try:
        import asyncio

        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(fn(payload))
            return
    except RuntimeError:
        pass

    try:
        anyio.from_thread.run(fn, payload)
    except Exception:
        pass
