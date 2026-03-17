from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TradeExecute(BaseModel):
    symbol: str
    side: str  # "buy" | "sell"
    quantity: float
    strategy_id: Optional[int] = None


class TradeResponse(BaseModel):
    id: int
    user_id: int
    strategy_id: Optional[int]
    symbol: str
    side: str
    quantity: float
    price: float
    pnl: float
    is_paper: bool
    executed_at: datetime

    class Config:
        from_attributes = True
