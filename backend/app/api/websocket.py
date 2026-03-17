import json
import asyncio
import random
from datetime import datetime
from typing import Dict, Set, Optional
import aiohttp
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
from jose import JWTError, jwt

from app.config import settings
from app.database import SessionLocal
from app.models.user import User
from app.services.account import build_account_snapshot

router = APIRouter()
logger = logging.getLogger(__name__)

# Alpha Vantage API Configuration
ALPHA_VANTAGE_API_KEY = "20YL316713W07TQL"
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.user_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        for user_id, conns in list(self.user_connections.items()):
            conns.discard(websocket)
            if not conns:
                self.user_connections.pop(user_id, None)

    def bind_user(self, user_id: int, websocket: WebSocket) -> None:
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")

    async def broadcast_to_user(self, user_id: int, message: dict):
        conns = self.user_connections.get(user_id) or set()
        for connection in list(conns):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")

manager = ConnectionManager()

# Public helper for other modules (trade execution, auto-trader, etc.)
async def emit_account_update(user_id: int, payload: dict) -> None:
    await manager.broadcast_to_user(user_id, {"type": "account_update", "data": payload})

async def emit_trade_notification(user_id: int, payload: dict) -> None:
    await manager.broadcast_to_user(
        user_id, {"type": "trade_notification", "data": payload}
    )

async def emit_bot_log(user_id: int, payload: dict) -> None:
    await manager.broadcast_to_user(user_id, {"type": "bot_log", "data": payload})

# Sample symbols to track
TRACKED_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]

# Store baseline prices for the mock generator
BASE_PRICES = {
    "AAPL": 175.50,
    "GOOGL": 140.20,
    "MSFT": 380.10,
    "TSLA": 210.80,
    "AMZN": 155.40
}

async def fetch_price_updates():
    """Generate realistic mock price updates to avoid API rate limits."""
    try:
        prices_to_send = []
        for symbol in TRACKED_SYMBOLS:
            base = BASE_PRICES.get(symbol, 100.0)
            change = base * random.uniform(-0.002, 0.002)
            new_price = base + change
            BASE_PRICES[symbol] = new_price
            
            percent_change = (change / base) * 100
            
            prices_to_send.append({
                "symbol": symbol,
                "price": round(new_price, 2),
                "change": round(change, 2),
                "changePercent": round(percent_change, 2),
                "timestamp": int(datetime.now().timestamp() * 1000)
            })
            
        if prices_to_send and len(manager.active_connections) > 0:
            message = {
                "type": "price_update",
                "data": prices_to_send
            }
            await manager.broadcast(message)
    except Exception as e:
        logger.error(f"Error in mock price generation: {e}")

async def price_update_worker():
    """Background worker to send price updates frequently"""
    logger.info("Price update worker started (Mock Data)")
    while True:
        try:
            if len(manager.active_connections) > 0:
                await fetch_price_updates()
            await asyncio.sleep(2)  # Update every 2 seconds for smooth chart
        except Exception as e:
            logger.error(f"Error in price_update_worker: {e}")
            await asyncio.sleep(2)

worker_task = None


def _get_user_id_from_token(token: Optional[str]) -> Optional[int]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time data"""
    global worker_task
    
    await manager.connect(websocket)
    logger.info(f"WebSocket connected. Active connections: {len(manager.active_connections)}")
    
    try:
        # Optionally bind a user (for account updates) using token query param
        token = websocket.query_params.get("token")
        user_id = _get_user_id_from_token(token)
        if user_id is not None:
            manager.bind_user(user_id, websocket)
            # Send an initial account snapshot so UI can render immediately
            try:
                db = SessionLocal()
                user = db.query(User).filter(User.id == user_id).first()
                if user is not None:
                    snapshot = build_account_snapshot(db, user)
                    snapshot["timestamp"] = int(datetime.utcnow().timestamp() * 1000)
                    await websocket.send_json({"type": "account_update", "data": snapshot})
            finally:
                try:
                    db.close()
                except Exception:
                    pass

        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "data": {"status": "connected", "message": "WebSocket connection established"}
        })
        
        # Start price update worker if not already running
        if worker_task is None or worker_task.done():
            worker_task = asyncio.create_task(price_update_worker())
            logger.info("Started price update worker")
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Echo back any received messages
            message = json.loads(data)
            logger.info(f"Received message: {message}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected. Active connections: {len(manager.active_connections)}")
    except Exception as e:
        manager.disconnect(websocket)
        logger.error(f"WebSocket error: {e}")
