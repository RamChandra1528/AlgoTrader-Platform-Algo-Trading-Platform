import numpy as np
from datetime import datetime
from typing import Dict, Any, Optional
import structlog
import asyncio

logger = structlog.get_logger()

class BrokerageSimulator:
    """Simulates brokerage execution with realistic market conditions"""
    
    def __init__(self):
        self.commission_rates = {
            "stocks": 0.001,  # 0.1% commission
            "etfs": 0.0005,   # 0.05% commission
            "options": 0.01,  # 1% commission
        }
        self.slippage_model = "linear"  # linear, percentage, volatility_based
        self.market_impact_model = "square_root"
        self.execution_delay = 0.1  # seconds
        
    async def execute_order(self, order) -> Dict[str, Any]:
        """Execute order with realistic simulation"""
        try:
            # Get current market price (in production, call market data service)
            current_price = await self._get_market_price(order.symbol)
            
            # Calculate execution price based on order type
            if order.order_type.value == "market":
                execution_price = await self._calculate_market_order_price(order, current_price)
            elif order.order_type.value == "limit":
                execution_price = await self._calculate_limit_order_price(order, current_price)
            else:
                execution_price = current_price  # Simplified for other order types
            
            # Calculate slippage
            slippage = self._calculate_slippage(order, current_price, execution_price)
            
            # Calculate commission
            commission = self._calculate_commission(order, execution_price)
            
            # Simulate partial fills for large orders
            executed_quantity = await self._calculate_fill_quantity(order, execution_price)
            
            # Calculate total cost
            total_cost = executed_quantity * execution_price + commission
            
            return {
                "executed_quantity": executed_quantity,
                "executed_price": execution_price,
                "commission": commission,
                "slippage": slippage,
                "total_cost": total_cost,
                "status": "filled" if executed_quantity > 0 else "rejected"
            }
            
        except Exception as e:
            logger.error("Order execution failed", order_id=order.id, error=str(e))
            raise
    
    async def _get_market_price(self, symbol: str) -> float:
        """Get current market price for symbol"""
        # In production, this would call the market data service
        # For simulation, return a realistic price
        np.random.seed(42)
        base_prices = {
            "AAPL": 150.0,
            "MSFT": 300.0,
            "GOOGL": 2500.0,
            "AMZN": 3500.0,
            "TSLA": 800.0
        }
        
        base_price = base_prices.get(symbol, 100.0)
        # Add small random variation
        variation = np.random.normal(0, 0.01)  # 1% standard deviation
        return base_price * (1 + variation)
    
    async def _calculate_market_order_price(self, order, current_price: float) -> float:
        """Calculate execution price for market orders"""
        # Market orders typically experience slippage
        slippage_rate = self._get_slippage_rate(order)
        
        if order.side.value == "buy":
            # Buy orders typically execute at higher price
            return current_price * (1 + slippage_rate)
        else:
            # Sell orders typically execute at lower price
            return current_price * (1 - slippage_rate)
    
    async def _calculate_limit_order_price(self, order, current_price: float) -> float:
        """Calculate execution price for limit orders"""
        if not order.price:
            return current_price
        
        # Check if limit order can be filled
        if order.side.value == "buy" and order.price >= current_price:
            # Buy limit order can be filled
            return min(order.price, current_price * 1.001)  # Small positive slippage
        elif order.side.value == "sell" and order.price <= current_price:
            # Sell limit order can be filled
            return max(order.price, current_price * 0.999)  # Small negative slippage
        else:
            # Limit order cannot be filled
            return current_price  # Will be rejected later
    
    def _get_slippage_rate(self, order) -> float:
        """Calculate slippage rate based on order size and market conditions"""
        # Base slippage rate
        base_slippage = 0.0001  # 0.01%
        
        # Size-based slippage (larger orders have more slippage)
        size_factor = min(order.quantity / 10000, 0.01)  # Max 1% additional slippage
        
        # Volatility-based slippage (would use real volatility in production)
        volatility_factor = 0.0005  # 0.05% for moderate volatility
        
        # Side-based slippage (buy orders typically have more slippage)
        side_factor = 0.0002 if order.side.value == "buy" else 0.0001
        
        total_slippage = base_slippage + size_factor + volatility_factor + side_factor
        return min(total_slippage, 0.01)  # Cap at 1%
    
    def _calculate_slippage(self, order, market_price: float, execution_price: float) -> float:
        """Calculate actual slippage amount"""
        if order.side.value == "buy":
            return execution_price - market_price
        else:
            return market_price - execution_price
    
    def _calculate_commission(self, order, execution_price: float) -> float:
        """Calculate commission based on order value"""
        order_value = order.quantity * execution_price
        
        # Determine commission rate based on instrument type
        commission_rate = self.commission_rates.get("stocks", 0.001)
        
        # Minimum commission
        min_commission = 1.0
        
        commission = max(order_value * commission_rate, min_commission)
        return commission
    
    async def _calculate_fill_quantity(self, order, execution_price: float) -> float:
        """Calculate actual fill quantity (may be partial for large orders)"""
        # For simulation, fill 100% of orders under 1000 shares
        # Partial fill for larger orders
        if order.quantity <= 1000:
            return order.quantity
        else:
            # Simulate partial fill for large orders
            fill_ratio = np.random.uniform(0.5, 1.0)
            return order.quantity * fill_ratio
    
    async def simulate_market_impact(self, symbol: str, quantity: float, side: str) -> float:
        """Simulate market impact of large orders"""
        # Square root model: impact = sigma * sqrt(quantity / daily_volume)
        # For simulation, use simplified model
        
        daily_volume = 1000000  # Placeholder daily volume
        volatility = 0.02  # 2% daily volatility
        
        if quantity / daily_volume < 0.001:  # Less than 0.1% of daily volume
            return 0.0
        
        impact = volatility * np.sqrt(quantity / daily_volume)
        
        # Directional impact
        if side == "buy":
            return impact  # Price moves up
        else:
            return -impact  # Price moves down
    
    def calculate_order_probability(self, order_type: str, price_diff: float) -> float:
        """Calculate probability of order execution"""
        if order_type == "market":
            return 1.0  # Market orders always execute (subject to liquidity)
        
        # For limit orders, probability depends on how aggressive the limit price is
        if order_type == "limit":
            if price_diff > 0.02:  # Very aggressive limit order
                return 0.9
            elif price_diff > 0.01:  # Moderately aggressive
                return 0.7
            elif price_diff > 0.005:  # Slightly aggressive
                return 0.4
            else:  # At or away from market
                return 0.1
        
        return 0.5  # Default probability
    
    async def get_order_book_snapshot(self, symbol: str) -> Dict[str, Any]:
        """Get simulated order book snapshot"""
        # In production, this would call market data service
        # For simulation, create a simple order book
        
        base_price = await self._get_market_price(symbol)
        
        # Generate bid/ask levels
        bid_levels = []
        ask_levels = []
        
        for i in range(5):
            bid_price = base_price * (1 - 0.001 * (i + 1))
            bid_size = np.random.uniform(100, 1000)
            bid_levels.append({"price": bid_price, "size": bid_size})
            
            ask_price = base_price * (1 + 0.001 * (i + 1))
            ask_size = np.random.uniform(100, 1000)
            ask_levels.append({"price": ask_price, "size": ask_size})
        
        return {
            "symbol": symbol,
            "timestamp": datetime.utcnow(),
            "bid_levels": bid_levels,
            "ask_levels": ask_levels,
            "spread": ask_levels[0]["price"] - bid_levels[0]["price"]
        }
