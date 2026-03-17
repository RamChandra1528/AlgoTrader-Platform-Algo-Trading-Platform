from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, List
import json
import structlog
from datetime import datetime

logger = structlog.get_logger()

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, Set[str]] = {}
        self.symbol_subscribers: Dict[str, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[websocket] = set()
        logger.info("WebSocket connected", total_connections=len(self.active_connections))
        
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            # Remove from symbol subscriptions
            for symbol in self.active_connections[websocket]:
                if symbol in self.symbol_subscribers:
                    self.symbol_subscribers[symbol].discard(websocket)
                    if not self.symbol_subscribers[symbol]:
                        del self.symbol_subscribers[symbol]
            
            del self.active_connections[websocket]
            logger.info("WebSocket disconnected", total_connections=len(self.active_connections))
            
    async def subscribe(self, websocket: WebSocket, symbols: List[str]):
        if websocket not in self.active_connections:
            return
            
        for symbol in symbols:
            self.active_connections[websocket].add(symbol)
            
            if symbol not in self.symbol_subscribers:
                self.symbol_subscribers[symbol] = set()
            self.symbol_subscribers[symbol].add(websocket)
            
        logger.info("Client subscribed to symbols", symbols=symbols, client_id=id(websocket))
        
    async def unsubscribe(self, websocket: WebSocket, symbols: List[str]):
        if websocket not in self.active_connections:
            return
            
        for symbol in symbols:
            self.active_connections[websocket].discard(symbol)
            
            if symbol in self.symbol_subscribers:
                self.symbol_subscribers[symbol].discard(websocket)
                if not self.symbol_subscribers[symbol]:
                    del self.symbol_subscribers[symbol]
                    
        logger.info("Client unsubscribed from symbols", symbols=symbols, client_id=id(websocket))
        
    async def broadcast_to_symbol(self, symbol: str, message: dict):
        if symbol not in self.symbol_subscribers:
            return
            
        disconnected = []
        for websocket in self.symbol_subscribers[symbol].copy():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error("Error sending WebSocket message", error=str(e))
                disconnected.append(websocket)
                
        # Clean up disconnected clients
        for websocket in disconnected:
            self.disconnect(websocket)
            
    async def broadcast_to_all(self, message: dict):
        disconnected = []
        for websocket in self.active_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error("Error broadcasting to client", error=str(e))
                disconnected.append(websocket)
                
        # Clean up disconnected clients
        for websocket in disconnected:
            self.disconnect(websocket)
            
    def get_connection_stats(self) -> dict:
        return {
            "total_connections": len(self.active_connections),
            "symbol_subscriptions": {
                symbol: len(subscribers) 
                for symbol, subscribers in self.symbol_subscribers.items()
            }
        }
