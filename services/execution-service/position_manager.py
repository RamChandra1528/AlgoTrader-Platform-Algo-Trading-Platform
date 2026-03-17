from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from typing import Dict, Any, Optional
import structlog
import asyncio

from .database import AsyncSessionLocal
from .models import Position, Execution
from .schemas import PositionResponse

logger = structlog.get_logger()

class PositionManager:
    """Manages trading positions and P&L calculations"""
    
    def __init__(self):
        self.position_cache: Dict[str, Position] = {}
        
    async def update_position(self, execution: Execution) -> Position:
        """Update position based on execution"""
        try:
            async with AsyncSessionLocal() as db:
                # Find existing position for this symbol
                result = await db.execute(
                    select(Position).where(
                        and_(
                            Position.symbol == execution.symbol,
                            Position.is_open == True
                        )
                    )
                )
                position = result.scalar_one_or_none()
                
                if position:
                    # Update existing position
                    await self._update_existing_position(position, execution, db)
                else:
                    # Create new position
                    position = await self._create_new_position(execution, db)
                
                await db.commit()
                await db.refresh(position)
                
                # Update cache
                self.position_cache[execution.symbol] = position
                
                logger.info("Position updated", 
                           symbol=execution.symbol,
                           side=execution.side.value,
                           quantity=execution.quantity)
                
                return position
                
        except Exception as e:
            logger.error("Failed to update position", 
                        symbol=execution.symbol, 
                        error=str(e))
            raise
    
    async def _update_existing_position(self, position: Position, execution: Execution, db: AsyncSession):
        """Update an existing position with new execution"""
        if position.side == execution.side.value:
            # Adding to position (increasing size)
            new_quantity = position.quantity + execution.quantity
            new_cost_basis = position.cost_basis + (execution.quantity * execution.price)
            
            position.quantity = new_quantity
            position.cost_basis = new_cost_basis
            position.average_price = new_cost_basis / new_quantity
            
        else:
            # Reducing or closing position
            if abs(execution.quantity) >= abs(position.quantity):
                # Closing position completely
                position.quantity = 0
                position.is_open = False
                position.closed_at = datetime.utcnow()
                
                # Calculate realized P&L
                realized_pnl = self._calculate_realized_pnl(position, execution)
                position.realized_pnl += realized_pnl
                
            else:
                # Partially closing position
                remaining_quantity = position.quantity - execution.quantity
                
                # Update cost basis proportionally
                cost_basis_reduction = (execution.quantity / position.quantity) * position.cost_basis
                position.cost_basis -= cost_basis_reduction
                position.quantity = remaining_quantity
                
                # Calculate realized P&L for the closed portion
                realized_pnl = self._calculate_realized_pnl(position, execution)
                position.realized_pnl += realized_pnl
        
        # Update market value and P&L
        await self._update_position_metrics(position, db)
    
    async def _create_new_position(self, execution: Execution, db: AsyncSession) -> Position:
        """Create a new position from execution"""
        position = Position(
            symbol=execution.symbol,
            quantity=execution.quantity,
            side=execution.side.value,
            cost_basis=execution.quantity * execution.price,
            average_price=execution.price,
            current_price=execution.price,
            is_open=True,
            opened_at=datetime.utcnow()
        )
        
        db.add(position)
        
        # Link execution to position
        execution.position_id = position.id
        
        await self._update_position_metrics(position, db)
        
        return position
    
    def _calculate_realized_pnl(self, position: Position, execution: Execution) -> float:
        """Calculate realized P&L for position closing"""
        if position.side == "long":
            # Long position: sell price - average buy price
            return (execution.price - position.average_price) * execution.quantity
        else:
            # Short position: average sell price - buy price
            return (position.average_price - execution.price) * execution.quantity
    
    async def _update_position_metrics(self, position: Position, db: AsyncSession):
        """Update position market value and P&L metrics"""
        # Get current market price (in production, call market data service)
        current_price = await self._get_current_price(position.symbol)
        position.current_price = current_price
        
        # Calculate market value
        position.market_value = position.quantity * current_price
        
        # Calculate unrealized P&L
        if position.side == "long":
            position.unrealized_pnl = (current_price - position.average_price) * position.quantity
        else:
            position.unrealized_pnl = (position.average_price - current_price) * position.quantity
        
        # Calculate unrealized P&L percentage
        if position.cost_basis > 0:
            position.unrealized_pnl_percent = position.unrealized_pnl / position.cost_basis
        else:
            position.unrealized_pnl_percent = 0.0
        
        # Calculate total P&L
        position.total_pnl = position.unrealized_pnl + position.realized_pnl
        
        position.last_updated = datetime.utcnow()
    
    async def _get_current_price(self, symbol: str) -> float:
        """Get current market price for symbol"""
        # In production, this would call the market data service
        # For simulation, return a realistic price
        import numpy as np
        
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
    
    async def get_position(self, symbol: str) -> Optional[Position]:
        """Get current position for symbol"""
        # Check cache first
        if symbol in self.position_cache:
            return self.position_cache[symbol]
        
        # Query database
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Position).where(
                    and_(
                        Position.symbol == symbol,
                        Position.is_open == True
                    )
                )
            )
            position = result.scalar_one_or_none()
            
            if position:
                self.position_cache[symbol] = position
            
            return position
    
    async def get_all_positions(self) -> list[Position]:
        """Get all open positions"""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Position).where(Position.is_open == True)
            )
            positions = result.scalars().all()
            
            # Update cache
            for position in positions:
                self.position_cache[position.symbol] = position
                await self._update_position_metrics(position, db)
            
            await db.commit()
            
            return positions
    
    async def close_position(self, symbol: str, reason: str = "manual") -> bool:
        """Close position for symbol"""
        try:
            position = await self.get_position(symbol)
            
            if not position:
                logger.warning("No position found to close", symbol=symbol)
                return False
            
            # Create closing execution (in production, this would create actual orders)
            current_price = await self._get_current_price(symbol)
            
            closing_execution = Execution(
                symbol=symbol,
                side="sell" if position.side == "long" else "buy",
                quantity=abs(position.quantity),
                price=current_price,
                commission=0.0,
                execution_time=datetime.utcnow()
            )
            
            # Update position
            await self.update_position(closing_execution)
            
            logger.info("Position closed", 
                       symbol=symbol, 
                       reason=reason,
                       realized_pnl=position.realized_pnl)
            
            return True
            
        except Exception as e:
            logger.error("Failed to close position", symbol=symbol, error=str(e))
            return False
    
    async def get_portfolio_summary(self) -> Dict[str, Any]:
        """Get portfolio summary of all positions"""
        positions = await self.get_all_positions()
        
        if not positions:
            return {
                "total_positions": 0,
                "total_market_value": 0.0,
                "total_cost_basis": 0.0,
                "total_unrealized_pnl": 0.0,
                "total_realized_pnl": 0.0,
                "total_pnl": 0.0
            }
        
        total_market_value = sum(p.market_value for p in positions)
        total_cost_basis = sum(p.cost_basis for p in positions)
        total_unrealized_pnl = sum(p.unrealized_pnl for p in positions)
        total_realized_pnl = sum(p.realized_pnl for p in positions)
        total_pnl = sum(p.total_pnl for p in positions)
        
        return {
            "total_positions": len(positions),
            "total_market_value": total_market_value,
            "total_cost_basis": total_cost_basis,
            "total_unrealized_pnl": total_unrealized_pnl,
            "total_realized_pnl": total_realized_pnl,
            "total_pnl": total_pnl,
            "positions": [
                {
                    "symbol": p.symbol,
                    "quantity": p.quantity,
                    "side": p.side,
                    "market_value": p.market_value,
                    "unrealized_pnl": p.unrealized_pnl,
                    "unrealized_pnl_percent": p.unrealized_pnl_percent,
                    "realized_pnl": p.realized_pnl,
                    "total_pnl": p.total_pnl
                }
                for p in positions
            ]
        }
    
    async def calculate_position_risk(self, symbol: str) -> Dict[str, Any]:
        """Calculate risk metrics for a position"""
        position = await self.get_position(symbol)
        
        if not position:
            return {}
        
        # Calculate position size relative to portfolio
        portfolio_summary = await self.get_portfolio_summary()
        position_weight = position.market_value / portfolio_summary["total_market_value"] if portfolio_summary["total_market_value"] > 0 else 0
        
        # Calculate maximum loss (if position goes to zero)
        max_loss = position.market_value if position.side == "long" else position.cost_basis * 2  # Short positions can lose more
        
        # Calculate daily P&L volatility (simplified)
        daily_volatility = 0.02  # 2% daily volatility assumption
        position_volatility = position.market_value * daily_volatility
        
        return {
            "symbol": symbol,
            "position_weight": position_weight,
            "max_loss": max_loss,
            "daily_volatility": position_volatility,
            "current_pnl": position.total_pnl,
            "pnl_percent": position.total_pnl / position.cost_basis if position.cost_basis > 0 else 0
        }
