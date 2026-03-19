from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ServiceStatusResponse(BaseModel):
    service_name: str
    status: str
    message: Optional[str] = None
    last_heartbeat: Optional[datetime] = None
    last_restart_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlatformRiskSettings(BaseModel):
    global_stop_loss_limit: float
    default_max_trade_amount: float
    default_daily_loss_limit: float
    default_max_trades_per_day: int


class PlatformControlState(PlatformRiskSettings):
    system_running: bool
    trading_enabled: bool
    market_data_enabled: bool
    updated_at: datetime


class AdminDashboardSummary(BaseModel):
    total_users: int
    active_traders: int
    total_trades_executed: int
    platform_realized_pnl: float
    platform_unrealized_pnl: float
    platform_equity: float
    system_status: str
    trading_enabled: bool
    market_data_enabled: bool
    services: List[ServiceStatusResponse]


class AdminUserSummary(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    is_trading_enabled: bool
    created_at: datetime
    starting_balance: float
    cash_balance: float
    max_trade_amount: float
    daily_loss_limit: float
    max_trades_per_day: int
    last_login_at: Optional[datetime] = None
    total_trades: int = 0
    open_positions: int = 0


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_trading_enabled: Optional[bool] = None
    role: Optional[str] = None
    max_trade_amount: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    max_trades_per_day: Optional[int] = None


class ResetBalanceRequest(BaseModel):
    new_balance: float = 100000.0


class ToggleRequest(BaseModel):
    enabled: bool


class ForceCloseRequest(BaseModel):
    user_id: Optional[int] = None


class StrategyAdminUpdate(BaseModel):
    parameters: Dict[str, Any]
    is_active: Optional[bool] = None


class TradeOverrideRequest(BaseModel):
    user_id: int
    symbol: str
    side: str
    quantity: float
    strategy_id: Optional[int] = None
    note: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: int
    actor_user_id: Optional[int] = None
    target_user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    severity: str
    details: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class AdminMonitorEvent(BaseModel):
    category: str
    action: str
    message: str
    timestamp: int
    user_id: Optional[int] = None
    symbol: Optional[str] = None
    value: Optional[float] = None
    meta: Dict[str, Any] = {}
