from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
import asyncio
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from .database import get_db, init_db
from .models import MarketData, Symbol
from .schemas import MarketDataResponse, SymbolResponse, PriceUpdate
from .market_data_fetcher import MarketDataFetcher
from .websocket_manager import WebSocketManager

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    # Start background market data fetcher
    app.state.market_fetcher = MarketDataFetcher()
    app.state.websocket_manager = WebSocketManager()
    
    # Start background tasks
    asyncio.create_task(app.state.market_fetcher.start_fetching())
    
    yield
    
    # Cleanup
    await app.state.market_fetcher.stop_fetching()

app = FastAPI(
    title="Market Data Service",
    version="2.0.0",
    description="Real-time market data and WebSocket streaming",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/market-data/symbols", response_model=List[SymbolResponse])
async def get_symbols(
    skip: int = 0,
    limit: int = 100,
    db = Depends(get_db)
):
    from sqlalchemy import select
    result = await db.execute(select(Symbol).offset(skip).limit(limit))
    symbols = result.scalars().all()
    return symbols

@app.post("/market-data/symbols", response_model=SymbolResponse)
async def add_symbol(
    symbol_data: dict,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    # Check if symbol exists
    result = await db.execute(
        select(Symbol).where(Symbol.ticker == symbol_data["ticker"])
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Symbol already exists")
    
    symbol = Symbol(**symbol_data)
    db.add(symbol)
    await db.commit()
    await db.refresh(symbol)
    
    # Start fetching data for this symbol
    await app.state.market_fetcher.add_symbol(symbol.ticker)
    
    return symbol

@app.get("/market-data/{symbol}/latest", response_model=Optional[MarketDataResponse])
async def get_latest_data(
    symbol: str,
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    result = await db.execute(
        select(MarketData)
        .where(MarketData.symbol == symbol)
        .order_by(MarketData.timestamp.desc())
        .limit(1)
    )
    data = result.scalar_one_or_none()
    return data

@app.get("/market-data/{symbol}/history", response_model=List[MarketDataResponse])
async def get_historical_data(
    symbol: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(default=100, le=1000),
    db = Depends(get_db)
):
    from sqlalchemy import select
    
    query = select(MarketData).where(MarketData.symbol == symbol)
    
    if start_date:
        query = query.where(MarketData.timestamp >= start_date)
    if end_date:
        query = query.where(MarketData.timestamp <= end_date)
    
    query = query.order_by(MarketData.timestamp.desc()).limit(limit)
    
    result = await db.execute(query)
    data = result.scalars().all()
    return data

@app.get("/market-data/{symbol}/realtime")
async def get_realtime_price(symbol: str):
    # Get latest cached price from Redis
    price_data = await app.state.market_fetcher.get_cached_price(symbol)
    
    if not price_data:
        raise HTTPException(status_code=404, detail="No data available for symbol")
    
    return price_data

@app.websocket("/ws/market-data")
async def websocket_market_data(websocket: WebSocket):
    await app.state.websocket_manager.connect(websocket)
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "subscribe":
                symbols = message.get("symbols", [])
                await app.state.websocket_manager.subscribe(websocket, symbols)
            elif message["type"] == "unsubscribe":
                symbols = message.get("symbols", [])
                await app.state.websocket_manager.unsubscribe(websocket, symbols)
                
    except WebSocketDisconnect:
        app.state.websocket_manager.disconnect(websocket)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "market-data",
        "version": "2.0.0",
        "active_subscriptions": len(app.state.websocket_manager.connections)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
