from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

class BacktestBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    strategy_id: int
    symbol: str
    start_date: datetime
    end_date: datetime
    initial_capital: float = Field(..., gt=0)
    parameters: Optional[Dict[str, Any]] = {}

class BacktestCreate(BacktestBase):
    pass

class BacktestUpdate(BaseModel):
    name: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class BacktestResponse(BacktestBase):
    id: int
    status: str
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BacktestRequest(BaseModel):
    strategy_id: int
    symbol: str
    start_date: datetime
    end_date: datetime
    initial_capital: float = Field(..., gt=0)
    parameters: Optional[Dict[str, Any]] = {}

class BacktestResultBase(BaseModel):
    total_return: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    cagr: float
    total_trades: int
    winning_trades: int
    losing_trades: int

class BacktestResultResponse(BacktestResultBase):
    id: int
    backtest_id: int
    avg_win: Optional[float] = None
    avg_loss: Optional[float] = None
    largest_win: Optional[float] = None
    largest_loss: Optional[float] = None
    var_95: Optional[float] = None
    calmar_ratio: Optional[float] = None
    kelly_criterion: Optional[float] = None
    equity_curve: Optional[List[Dict[str, Any]]] = None
    trades: Optional[List[Dict[str, Any]]] = None
    drawdown_periods: Optional[List[Dict[str, Any]]] = None
    monthly_returns: Optional[List[Dict[str, Any]]] = None
    trade_distribution: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class PerformanceMetrics(BaseModel):
    # Basic metrics
    total_return: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    cagr: float
    
    # Advanced metrics
    calmar_ratio: float
    var_95: float
    kelly_criterion: float
    information_ratio: float
    beta: float
    alpha: float
    
    # Trade statistics
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    largest_win: float
    largest_loss: float
    avg_trade_duration: float
    
    # Risk metrics
    downside_deviation: float
    upside_capture: float
    downside_capture: float
    recovery_factor: float
