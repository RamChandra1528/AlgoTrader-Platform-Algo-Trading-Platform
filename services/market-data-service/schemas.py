from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class SymbolBase(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)
    name: str = Field(..., min_length=1, max_length=100)
    exchange: str = Field(..., min_length=1, max_length=50)
    sector: Optional[str] = None

class SymbolCreate(SymbolBase):
    pass

class SymbolResponse(SymbolBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class MarketDataBase(BaseModel):
    symbol: str
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: int

class MarketDataCreate(MarketDataBase):
    timestamp: datetime

class MarketDataResponse(MarketDataBase):
    id: int
    timestamp: datetime
    vwap: Optional[float] = None
    rsi: Optional[float] = None
    macd: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_lower: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class PriceUpdate(BaseModel):
    type: str = "price_update"
    symbol: str
    price: float
    volume: int
    timestamp: datetime
    change: Optional[float] = None
    change_percent: Optional[float] = None

class WebSocketMessage(BaseModel):
    type: str
    symbols: Optional[List[str]] = None
    data: Optional[dict] = None
