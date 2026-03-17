from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List
from .models import StrategyType

class StrategyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    strategy_type: StrategyType
    code: str
    parameters: Optional[Dict[str, Any]] = {}

class StrategyCreate(StrategyBase):
    pass

class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class StrategyResponse(StrategyBase):
    id: int
    is_active: bool
    is_builtin: bool
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class StrategyInstanceBase(BaseModel):
    strategy_id: int
    name: str
    symbol: str
    parameters: Optional[Dict[str, Any]] = {}

class StrategyInstanceCreate(StrategyInstanceBase):
    pass

class StrategyInstanceResponse(StrategyInstanceBase):
    id: int
    status: str
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    last_execution: Optional[datetime] = None
    current_pnl: float
    total_trades: int
    winning_trades: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class StrategyExecutionRequest(BaseModel):
    strategy_id: int
    symbol: str
    parameters: Optional[Dict[str, Any]] = {}
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    initial_capital: float = 10000.0

class StrategyExecutionResult(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    trades: Optional[List[Dict[str, Any]]] = None
    performance: Optional[Dict[str, float]] = None

class TradeResponse(BaseModel):
    id: int
    strategy_instance_id: int
    symbol: str
    side: str
    quantity: float
    price: float
    status: str
    entry_time: datetime
    exit_time: Optional[datetime] = None
    exit_price: Optional[float] = None
    pnl: float
    commission: float
    entry_signal: Optional[str] = None
    exit_signal: Optional[str] = None
    
    class Config:
        from_attributes = True

class StrategySignal(BaseModel):
    type: str  # buy, sell, hold
    strength: float  # 0-1
    timestamp: datetime
    price: float
    metadata: Optional[Dict[str, Any]] = {}
