import asyncio
import yfinance as yf
import pandas as pd
import redis.asyncio as redis
import structlog
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .database import AsyncSessionLocal
from .models import MarketData, Symbol
from .schemas import PriceUpdate

logger = structlog.get_logger()

class MarketDataFetcher:
    def __init__(self):
        self.redis_client = None
        self.active_symbols: set = set()
        self.fetch_interval = 60  # seconds
        self.running = False
        
    async def start_fetching(self):
        self.redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
        self.running = True
        
        # Load active symbols from database
        await self.load_active_symbols()
        
        # Start fetching loop
        asyncio.create_task(self._fetch_loop())
        
    async def stop_fetching(self):
        self.running = False
        if self.redis_client:
            await self.redis_client.close()
            
    async def load_active_symbols(self):
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Symbol).where(Symbol.is_active == True))
            symbols = result.scalars().all()
            self.active_symbols = {symbol.ticker for symbol in symbols}
            
    async def add_symbol(self, ticker: str):
        self.active_symbols.add(ticker)
        logger.info("Added symbol to fetching", symbol=ticker)
        
    async def remove_symbol(self, ticker: str):
        self.active_symbols.discard(ticker)
        logger.info("Removed symbol from fetching", symbol=ticker)
        
    async def _fetch_loop(self):
        while self.running:
            try:
                await self._fetch_market_data()
                await asyncio.sleep(self.fetch_interval)
            except Exception as e:
                logger.error("Error in fetch loop", error=str(e))
                await asyncio.sleep(10)  # Wait before retry
                
    async def _fetch_market_data(self):
        if not self.active_symbols:
            return
            
        # Fetch data in batches to avoid API limits
        symbols_list = list(self.active_symbols)
        batch_size = 10
        
        for i in range(0, len(symbols_list), batch_size):
            batch = symbols_list[i:i + batch_size]
            await self._fetch_batch(batch)
            
    async def _fetch_batch(self, symbols: List[str]):
        try:
            # Fetch data using yfinance
            tickers = yf.Tickers(" ".join(symbols))
            
            for symbol in symbols:
                try:
                    ticker_obj = tickers.tickers[symbol]
                    info = ticker_obj.info
                    
                    # Get current price data
                    current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                    volume = info.get('volume', 0)
                    
                    if current_price and volume:
                        # Create price update
                        price_update = PriceUpdate(
                            type="price_update",
                            symbol=symbol,
                            price=current_price,
                            volume=volume,
                            timestamp=datetime.utcnow()
                        )
                        
                        # Cache in Redis
                        await self._cache_price_data(symbol, price_update.dict())
                        
                        # Store in database
                        await self._store_market_data(symbol, current_price, volume)
                        
                        logger.debug("Fetched market data", symbol=symbol, price=current_price)
                        
                except Exception as e:
                    logger.error("Error fetching symbol data", symbol=symbol, error=str(e))
                    
        except Exception as e:
            logger.error("Error in batch fetch", symbols=symbols, error=str(e))
            
    async def _cache_price_data(self, symbol: str, data: dict):
        if self.redis_client:
            cache_key = f"price:{symbol}"
            await self.redis_client.setex(cache_key, 300, json.dumps(data))  # Cache for 5 minutes
            
    async def _store_market_data(self, symbol: str, price: float, volume: int):
        async with AsyncSessionLocal() as db:
            # Get the latest data for this symbol
            result = await db.execute(
                select(MarketData)
                .where(MarketData.symbol == symbol)
                .order_by(MarketData.timestamp.desc())
                .limit(1)
            )
            latest = result.scalar_one_or_none()
            
            # Check if we already have data for this minute
            now = datetime.utcnow()
            if latest and (now - latest.timestamp).seconds < 60:
                return  # Skip if we have recent data
                
            # Create new market data entry
            market_data = MarketData(
                symbol=symbol,
                timestamp=now,
                open_price=price,
                high_price=price,
                low_price=price,
                close_price=price,
                volume=volume
            )
            
            db.add(market_data)
            await db.commit()
            
    async def get_cached_price(self, symbol: str) -> Optional[dict]:
        if not self.redis_client:
            return None
            
        cache_key = f"price:{symbol}"
        cached_data = await self.redis_client.get(cache_key)
        
        if cached_data:
            return json.loads(cached_data)
        return None
        
    async def get_historical_data(self, symbol: str, period: str = "1mo") -> pd.DataFrame:
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period)
            return data
        except Exception as e:
            logger.error("Error fetching historical data", symbol=symbol, error=str(e))
            return pd.DataFrame()
