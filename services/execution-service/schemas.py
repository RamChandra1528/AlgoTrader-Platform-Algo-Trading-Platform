from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from .models import OrderType, OrderSide, OrderStatus, TimeInForce

class OrderBase(BaseModel):
    strategy_instance_id: Optional[int] = None
    symbol: str = Field(..., min_length=1, max_length=10)
    side: OrderSide
    order_type: OrderType
    quantity: float = Field(..., gt=0)
    price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: TimeInForce = TimeInForce.DAY

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: Optional[TimeInForce] = None

class OrderResponse(OrderBase):
    id: int
    status: OrderStatus
    filled_quantity: float
    filled_price: Optional[float] = None
    average_price: Optional[float] = None
    commission: float
    submitted_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class OrderRequest(BaseModel):
    strategy_instance_id: int
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: float
    price: Optional[float] = None
    time_in_force: TimeInForce = TimeInForce.DAY

class PositionBase(BaseModel):
    symbol: str
    quantity: float
    side: str
    cost_basis: float
    market_value: Optional[float] = None
    unrealized_pnl: float = 0.0
    unrealized_pnl_percent: float = 0.0
    realized_pnl: float = 0.0

class PositionResponse(PositionBase):
    id: int
    average_price: Optional[float] = None
    current_price: Optional[float] = None
    total_pnl: float
    is_open: bool
    opened_at: datetime
    closed_at: Optional[datetime] = None
    last_updated: datetime
    
    class Config:
        from_attributes = True

class ExecutionBase(BaseModel):
    order_id: int
    symbol: str
    side: OrderSide
    quantity: float
    price: float
    commission: float = 0.0
    slippage: float = 0.0

class ExecutionResponse(ExecutionBase):
    id: int
    position_id: Optional[int] = None
    total_cost: float
    realized_pnl: float = 0.0
    execution_time: datetime
    exchange_execution_id: Optional[str] = None
    liquidity_provider: Optional[str] = None
    execution_venue: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExecutionResult(BaseModel):
    success: bool
    order_id: Optional[int] = None
    message: str
    executed_quantity: Optional[float] = None
    executed_price: Optional[float] = None
    commission: Optional[float] = None
    slippage: Optional[float] = None

class PortfolioSummary(BaseModel):
    total_market_value: float
    total_cost_basis: float
    total_unrealized_pnl: float
    total_realized_pnl: float
    number_of_positions: int
    today_executions: int
    positions: list
