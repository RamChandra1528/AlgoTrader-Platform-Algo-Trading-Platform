from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class StrategyCreate(BaseModel):
    name: str
    strategy_type: str  # "ma_crossover" | "rsi"
    parameters: dict = {}


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    parameters: Optional[dict] = None
    is_active: Optional[bool] = None


class StrategyResponse(BaseModel):
    id: int
    user_id: int
    name: str
    strategy_type: str
    parameters: dict
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
