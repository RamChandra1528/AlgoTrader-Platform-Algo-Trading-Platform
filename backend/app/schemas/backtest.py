from datetime import datetime
from typing import List
from pydantic import BaseModel


class BacktestRequest(BaseModel):
    strategy_id: int
    symbol: str
    start_date: str  # "YYYY-MM-DD"
    end_date: str
    initial_capital: float = 100000.0


class BacktestResponse(BaseModel):
    id: int
    user_id: int
    strategy_id: int
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float
    final_value: float
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    equity_curve: list
    trades_log: list
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_pnl: float
    total_trades: int
    open_positions: int
    portfolio_value: float
    win_rate: float
