from datetime import datetime
from typing import Dict, Any, Optional
import structlog
import asyncio

from .models import Order, OrderStatus
from .brokerage_simulator import BrokerageSimulator
from .position_manager import PositionManager

logger = structlog.get_logger()

class OrderExecutor:
    """Handles order execution logic and coordination"""
    
    def __init__(self):
        self.brokerage_simulator = BrokerageSimulator()
        self.position_manager = PositionManager()
        self.active_orders: Dict[int, Order] = {}
        
    async def submit_order(self, order: Order) -> Dict[str, Any]:
        """Submit order for execution"""
        try:
            # Validate order
            validation_result = await self._validate_order(order)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "message": validation_result["error"]
                }
            
            # Add to active orders
            self.active_orders[order.id] = order
            
            # Update order status
            order.status = OrderStatus.SUBMITTED
            order.submitted_at = datetime.utcnow()
            
            # Execute order
            execution_result = await self.brokerage_simulator.execute_order(order)
            
            # Process execution result
            if execution_result["status"] == "filled":
                await self._process_filled_order(order, execution_result)
            else:
                await self._process_rejected_order(order, execution_result)
            
            # Remove from active orders
            if order.id in self.active_orders:
                del self.active_orders[order.id]
            
            return execution_result
            
        except Exception as e:
            logger.error("Order submission failed", order_id=order.id, error=str(e))
            
            # Update order status to failed
            order.status = OrderStatus.FAILED
            order.error_message = str(e)
            
            return {
                "success": False,
                "message": f"Order execution failed: {str(e)}"
            }
    
    async def _validate_order(self, order: Order) -> Dict[str, Any]:
        """Validate order before submission"""
        try:
            # Check basic order parameters
            if order.quantity <= 0:
                return {"valid": False, "error": "Quantity must be positive"}
            
            if order.order_type.value == "limit" and not order.price:
                return {"valid": False, "error": "Limit orders must have a price"}
            
            if order.order_type.value == "stop" and not order.stop_price:
                return {"valid": False, "error": "Stop orders must have a stop price"}
            
            # Check for sufficient buying power (in production, check account balance)
            # For simulation, assume sufficient funds
            
            # Check market hours (in production, check exchange hours)
            # For simulation, allow 24/7 trading
            
            return {"valid": True}
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def _process_filled_order(self, order: Order, execution_result: Dict[str, Any]):
        """Process successfully filled order"""
        try:
            # Update order details
            order.status = OrderStatus.FILLED
            order.filled_quantity = execution_result["executed_quantity"]
            order.filled_price = execution_result["executed_price"]
            order.average_price = execution_result["executed_price"]
            order.commission = execution_result["commission"]
            order.filled_at = datetime.utcnow()
            
            # Create execution record
            from .database import AsyncSessionLocal
            from .models import Execution
            
            async with AsyncSessionLocal() as db:
                execution = Execution(
                    order_id=order.id,
                    symbol=order.symbol,
                    side=order.side,
                    quantity=execution_result["executed_quantity"],
                    price=execution_result["executed_price"],
                    commission=execution_result["commission"],
                    slippage=execution_result["slippage"],
                    total_cost=execution_result["total_cost"],
                    execution_time=datetime.utcnow()
                )
                
                db.add(execution)
                await db.commit()
                await db.refresh(execution)
                
                # Update position
                await self.position_manager.update_position(execution)
            
            logger.info("Order filled successfully", 
                       order_id=order.id,
                       quantity=execution_result["executed_quantity"],
                       price=execution_result["executed_price"])
            
        except Exception as e:
            logger.error("Failed to process filled order", order_id=order.id, error=str(e))
            raise
    
    async def _process_rejected_order(self, order: Order, execution_result: Dict[str, Any]):
        """Process rejected order"""
        order.status = OrderStatus.REJECTED
        order.error_message = execution_result.get("message", "Order rejected")
        
        logger.warning("Order rejected", 
                      order_id=order.id,
                      reason=order.error_message)
    
    async def cancel_order(self, order_id: int) -> bool:
        """Cancel an active order"""
        try:
            if order_id not in self.active_orders:
                logger.warning("Order not found for cancellation", order_id=order_id)
                return False
            
            order = self.active_orders[order_id]
            
            # Check if order can be cancelled
            if order.status not in [OrderStatus.PENDING, OrderStatus.SUBMITTED]:
                logger.warning("Order cannot be cancelled", 
                             order_id=order_id, 
                             status=order.status.value)
                return False
            
            # Update order status
            order.status = OrderStatus.CANCELLED
            order.cancelled_at = datetime.utcnow()
            
            # Remove from active orders
            del self.active_orders[order_id]
            
            logger.info("Order cancelled successfully", order_id=order_id)
            return True
            
        except Exception as e:
            logger.error("Failed to cancel order", order_id=order_id, error=str(e))
            return False
    
    async def get_order_status(self, order_id: int) -> Optional[Dict[str, Any]]:
        """Get current status of an order"""
        if order_id in self.active_orders:
            order = self.active_orders[order_id]
            return {
                "order_id": order.id,
                "status": order.status.value,
                "filled_quantity": order.filled_quantity,
                "filled_price": order.filled_price,
                "submitted_at": order.submitted_at,
                "filled_at": order.filled_at
            }
        
        # Query database for completed orders
        from .database import AsyncSessionLocal
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Order).where(Order.id == order_id))
            order = result.scalar_one_or_none()
            
            if order:
                return {
                    "order_id": order.id,
                    "status": order.status.value,
                    "filled_quantity": order.filled_quantity,
                    "filled_price": order.filled_price,
                    "submitted_at": order.submitted_at,
                    "filled_at": order.filled_at,
                    "cancelled_at": order.cancelled_at,
                    "error_message": order.error_message
                }
        
        return None
    
    async def get_active_orders_count(self) -> int:
        """Get count of active orders"""
        return len(self.active_orders)
    
    async def cancel_all_orders(self, symbol: Optional[str] = None) -> int:
        """Cancel all active orders, optionally filtered by symbol"""
        cancelled_count = 0
        
        orders_to_cancel = list(self.active_orders.values())
        
        if symbol:
            orders_to_cancel = [order for order in orders_to_cancel if order.symbol == symbol]
        
        for order in orders_to_cancel:
            if await self.cancel_order(order.id):
                cancelled_count += 1
        
        logger.info("Bulk cancellation completed", 
                   cancelled_count=cancelled_count,
                   symbol_filter=symbol)
        
        return cancelled_count
    
    async def estimate_execution_cost(self, symbol: str, quantity: float, side: str) -> Dict[str, float]:
        """Estimate execution costs for planning purposes"""
        try:
            # Get current market price
            current_price = await self.brokerage_simulator._get_market_price(symbol)
            
            # Create mock order for estimation
            from .models import Order, OrderSide, OrderType
            
            mock_order = Order(
                symbol=symbol,
                side=OrderSide.BUY if side == "buy" else OrderSide.SELL,
                order_type=OrderType.MARKET,
                quantity=quantity,
                price=current_price
            )
            
            # Calculate estimated slippage
            slippage_rate = self.brokerage_simulator._get_slippage_rate(mock_order)
            estimated_slippage = current_price * slippage_rate * quantity
            
            # Calculate estimated commission
            estimated_commission = self.brokerage_simulator._calculate_commission(mock_order, current_price)
            
            # Calculate total estimated cost
            total_cost = (current_price * quantity) + estimated_slippage + estimated_commission
            
            return {
                "estimated_price": current_price,
                "estimated_slippage": estimated_slippage,
                "estimated_commission": estimated_commission,
                "total_estimated_cost": total_cost,
                "slippage_rate": slippage_rate
            }
            
        except Exception as e:
            logger.error("Failed to estimate execution cost", symbol=symbol, error=str(e))
            return {
                "estimated_price": 0.0,
                "estimated_slippage": 0.0,
                "estimated_commission": 0.0,
                "total_estimated_cost": 0.0,
                "slippage_rate": 0.0
            }
