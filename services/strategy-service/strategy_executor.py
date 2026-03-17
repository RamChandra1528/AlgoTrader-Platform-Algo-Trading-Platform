import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .database import AsyncSessionLocal
from .models import StrategyInstance, Trade
from .strategy_loader import BaseStrategy
from .schemas import StrategyExecutionResult

logger = structlog.get_logger()

class StrategyExecutor:
    def __init__(self):
        self.running_instances: Dict[int, asyncio.Task] = {}
        self.market_data_cache: Dict[str, pd.DataFrame] = {}
        
    async def execute_strategy(self, request: Dict[str, Any]) -> StrategyExecutionResult:
        """Execute a strategy for backtesting or analysis"""
        try:
            strategy_id = request["strategy_id"]
            symbol = request["symbol"]
            parameters = request.get("parameters", {})
            start_date = request.get("start_date")
            end_date = request.get("end_date")
            initial_capital = request.get("initial_capital", 10000.0)
            
            # Get strategy class
            from .strategy_loader import StrategyLoader
            loader = StrategyLoader()
            
            # This would be loaded from database in real implementation
            strategy_name = "MovingAverageCrossover"  # Placeholder
            strategy = loader.get_strategy(strategy_name)
            
            if not strategy:
                return StrategyExecutionResult(
                    success=False,
                    message="Strategy not found"
                )
            
            # Get market data
            market_data = await self._get_market_data(
                symbol, start_date, end_date
            )
            
            if market_data.empty:
                return StrategyExecutionResult(
                    success=False,
                    message="No market data available"
                )
            
            # Execute strategy
            trades, performance = await self._run_strategy_backtest(
                strategy, market_data, parameters, initial_capital
            )
            
            return StrategyExecutionResult(
                success=True,
                message="Strategy executed successfully",
                data={
                    "symbol": symbol,
                    "period": f"{start_date} to {end_date}",
                    "initial_capital": initial_capital
                },
                trades=trades,
                performance=performance
            )
            
        except Exception as e:
            logger.error("Strategy execution failed", error=str(e))
            return StrategyExecutionResult(
                success=False,
                message=f"Execution failed: {str(e)}"
            )
    
    async def start_instance(self, instance: StrategyInstance):
        """Start a strategy instance for live trading"""
        if instance.id in self.running_instances:
            logger.warning("Instance already running", instance_id=instance.id)
            return
        
        # Create async task for this instance
        task = asyncio.create_task(
            self._run_strategy_instance(instance)
        )
        self.running_instances[instance.id] = task
        
        logger.info("Strategy instance started", instance_id=instance.id)
    
    async def stop_instance(self, instance: StrategyInstance):
        """Stop a running strategy instance"""
        if instance.id not in self.running_instances:
            logger.warning("Instance not running", instance_id=instance.id)
            return
        
        # Cancel the task
        task = self.running_instances[instance.id]
        task.cancel()
        
        try:
            await task
        except asyncio.CancelledError:
            pass
        
        del self.running_instances[instance.id]
        
        logger.info("Strategy instance stopped", instance_id=instance.id)
    
    async def _run_strategy_instance(self, instance: StrategyInstance):
        """Run strategy instance in real-time"""
        try:
            # Load strategy
            from .strategy_loader import StrategyLoader
            loader = StrategyLoader()
            strategy = loader.get_strategy("MovingAverageCrossover")  # Placeholder
            
            if not strategy:
                logger.error("Strategy not found for instance", instance_id=instance.id)
                return
            
            while True:
                try:
                    # Get latest market data
                    market_data = await self._get_latest_market_data(instance.symbol)
                    
                    if not market_data.empty:
                        # Generate signals
                        signals = strategy.generate_signals(market_data.to_dict('list'))
                        
                        # Process signals
                        for signal in signals:
                            await self._process_signal(instance, signal)
                    
                    # Update instance last execution time
                    async with AsyncSessionLocal() as db:
                        instance.last_execution = datetime.utcnow()
                        await db.commit()
                    
                    # Wait for next iteration (e.g., every minute)
                    await asyncio.sleep(60)
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error("Error in strategy instance loop", 
                               instance_id=instance.id, error=str(e))
                    await asyncio.sleep(10)  # Wait before retry
                    
        except asyncio.CancelledError:
            logger.info("Strategy instance cancelled", instance_id=instance.id)
        except Exception as e:
            logger.error("Strategy instance failed", instance_id=instance.id, error=str(e))
    
    async def _process_signal(self, instance: StrategyInstance, signal: Dict[str, Any]):
        """Process a trading signal"""
        try:
            signal_type = signal["type"]
            strength = signal["strength"]
            price = signal["price"]
            
            # Check if signal meets minimum strength threshold
            if strength < 0.5:  # Configurable threshold
                return
            
            async with AsyncSessionLocal() as db:
                # Check for existing open positions
                result = await db.execute(
                    select(Trade).where(
                        Trade.strategy_instance_id == instance.id,
                        Trade.status == "open"
                    )
                )
                open_trades = result.scalars().all()
                
                # Process signal based on type and existing positions
                if signal_type == "buy" and not open_trades:
                    # Open new long position
                    trade = Trade(
                        strategy_instance_id=instance.id,
                        symbol=instance.symbol,
                        side="buy",
                        quantity=100,  # Position sizing logic here
                        price=price,
                        entry_signal=str(signal),
                        commission=price * 100 * 0.001  # Commission calculation
                    )
                    db.add(trade)
                    
                elif signal_type == "sell" and open_trades:
                    # Close existing position
                    for trade in open_trades:
                        trade.status = "closed"
                        trade.exit_time = datetime.utcnow()
                        trade.exit_price = price
                        trade.exit_signal = str(signal)
                        trade.pnl = (price - trade.price) * trade.quantity - trade.commission
                
                await db.commit()
                
                logger.info("Signal processed", 
                           instance_id=instance.id, 
                           signal_type=signal_type,
                           price=price)
                
        except Exception as e:
            logger.error("Error processing signal", 
                        instance_id=instance.id, 
                        error=str(e))
    
    async def _get_market_data(self, symbol: str, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Get historical market data"""
        # This would call market data service
        # For now, return sample data
        dates = pd.date_range(start_date, end_date, freq='1D')
        np.random.seed(42)
        
        prices = 100 + np.cumsum(np.random.randn(len(dates)) * 0.01)
        volumes = np.random.randint(1000, 10000, len(dates))
        
        return pd.DataFrame({
            'date': dates,
            'close': prices,
            'high': prices * 1.02,
            'low': prices * 0.98,
            'open': np.roll(prices, 1),
            'volume': volumes
        }).set_index('date')
    
    async def _get_latest_market_data(self, symbol: str) -> pd.DataFrame:
        """Get latest market data for real-time trading"""
        # This would call market data service via API
        # For now, return sample data
        now = datetime.utcnow()
        
        return pd.DataFrame({
            'date': [now - timedelta(days=i) for i in range(100, 0, -1)],
            'close': np.random.randn(100).cumsum() + 100,
            'high': np.random.randn(100).cumsum() + 102,
            'low': np.random.randn(100).cumsum() + 98,
            'open': np.random.randn(100).cumsum() + 100,
            'volume': np.random.randint(1000, 10000, 100)
        }).set_index('date')
    
    async def _run_strategy_backtest(
        self, 
        strategy: BaseStrategy, 
        data: pd.DataFrame, 
        parameters: Dict[str, Any],
        initial_capital: float
    ) -> tuple[List[Dict[str, Any]], Dict[str, float]]:
        """Run strategy backtest"""
        try:
            # Set strategy parameters
            strategy.parameters = parameters
            
            # Generate signals
            signals = strategy.generate_signals(data.to_dict('list'))
            
            # Simulate trades
            trades = []
            portfolio_value = initial_capital
            position = 0
            cash = initial_capital
            
            for signal in signals:
                price = signal["price"]
                signal_type = signal["type"]
                
                if signal_type == "buy" and position == 0:
                    # Open position
                    position_size = cash * 0.95 / price  # Use 95% of cash
                    position = position_size
                    cash -= position_size * price
                    
                    trades.append({
                        "type": "buy",
                        "price": price,
                        "quantity": position_size,
                        "timestamp": signal["timestamp"],
                        "portfolio_value": cash + position * price
                    })
                    
                elif signal_type == "sell" and position > 0:
                    # Close position
                    cash += position * price
                    pnl = position * (price - trades[-1]["price"]) if trades else 0
                    position = 0
                    
                    trades.append({
                        "type": "sell",
                        "price": price,
                        "quantity": trades[-1]["quantity"] if trades else 0,
                        "timestamp": signal["timestamp"],
                        "portfolio_value": cash,
                        "pnl": pnl
                    })
            
            # Calculate performance metrics
            final_value = cash + position * data['close'].iloc[-1] if position > 0 else cash
            total_return = (final_value - initial_capital) / initial_capital
            
            # Calculate Sharpe ratio (simplified)
            returns = []
            for i in range(1, len(trades)):
                prev_value = trades[i-1]["portfolio_value"]
                curr_value = trades[i]["portfolio_value"]
                returns.append((curr_value - prev_value) / prev_value)
            
            sharpe_ratio = np.mean(returns) / np.std(returns) if returns else 0
            
            # Calculate max drawdown
            portfolio_values = [t["portfolio_value"] for t in trades]
            peak = portfolio_values[0] if portfolio_values else initial_capital
            max_drawdown = 0
            
            for value in portfolio_values:
                if value > peak:
                    peak = value
                drawdown = (peak - value) / peak
                max_drawdown = max(max_drawdown, drawdown)
            
            # Calculate win rate
            winning_trades = sum(1 for t in trades if t.get("pnl", 0) > 0)
            total_trades = len([t for t in trades if t["type"] == "sell"])
            win_rate = winning_trades / total_trades if total_trades > 0 else 0
            
            performance = {
                "total_return": total_return,
                "sharpe_ratio": sharpe_ratio,
                "max_drawdown": max_drawdown,
                "win_rate": win_rate,
                "total_trades": total_trades,
                "final_value": final_value
            }
            
            return trades, performance
            
        except Exception as e:
            logger.error("Backtest execution failed", error=str(e))
            return [], {}
