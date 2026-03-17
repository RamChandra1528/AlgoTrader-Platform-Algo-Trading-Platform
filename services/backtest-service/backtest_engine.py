import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import structlog
import asyncio

logger = structlog.get_logger()

class BacktestEngine:
    def __init__(self):
        self.commission_rate = 0.001  # 0.1% commission
        self.slippage_rate = 0.0001   # 0.01% slippage
        
    async def run_backtest(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Run a complete backtest simulation"""
        try:
            strategy_id = config["strategy_id"]
            symbol = config["symbol"]
            start_date = config["start_date"]
            end_date = config["end_date"]
            initial_capital = config["initial_capital"]
            parameters = config.get("parameters", {})
            
            # Get market data
            market_data = await self._fetch_market_data(symbol, start_date, end_date)
            
            if market_data.empty:
                raise ValueError("No market data available for the specified period")
            
            # Get strategy and generate signals
            signals = await self._generate_strategy_signals(
                strategy_id, market_data, parameters
            )
            
            # Execute trades and calculate performance
            trades, equity_curve = await self._execute_trades(
                market_data, signals, initial_capital
            )
            
            # Calculate drawdown periods
            drawdown_periods = self._calculate_drawdown_periods(equity_curve)
            
            # Calculate monthly returns
            monthly_returns = self._calculate_monthly_returns(equity_curve)
            
            # Calculate trade distribution
            trade_distribution = self._calculate_trade_distribution(trades)
            
            return {
                "trades": trades,
                "equity_curve": equity_curve,
                "drawdown_periods": drawdown_periods,
                "monthly_returns": monthly_returns,
                "trade_distribution": trade_distribution,
                "market_data": market_data.to_dict('list')
            }
            
        except Exception as e:
            logger.error("Backtest execution failed", error=str(e))
            raise
    
    async def _fetch_market_data(self, symbol: str, start_date: datetime, end_date: datetime) -> pd.DataFrame:
        """Fetch historical market data"""
        # In production, this would call the market data service
        # For now, generate realistic sample data
        
        date_range = pd.date_range(start=start_date, end=end_date, freq='1D')
        np.random.seed(42)  # For reproducible results
        
        # Generate realistic price movements
        returns = np.random.normal(0.0005, 0.02, len(date_range))  # Daily returns
        prices = [100]  # Starting price
        
        for ret in returns:
            prices.append(prices[-1] * (1 + ret))
        
        prices = prices[1:]  # Remove initial price
        
        # Generate OHLC data
        data = []
        for i, (date, close) in enumerate(zip(date_range, prices)):
            # Generate realistic OHLC
            high = close * (1 + abs(np.random.normal(0, 0.01)))
            low = close * (1 - abs(np.random.normal(0, 0.01)))
            open_price = low + (high - low) * np.random.random()
            
            # Ensure OHLC relationships
            high = max(high, open_price, close)
            low = min(low, open_price, close)
            
            volume = np.random.randint(100000, 1000000)
            
            data.append({
                'date': date,
                'open': open_price,
                'high': high,
                'low': low,
                'close': close,
                'volume': volume
            })
        
        df = pd.DataFrame(data)
        df.set_index('date', inplace=True)
        
        return df
    
    async def _generate_strategy_signals(self, strategy_id: int, data: pd.DataFrame, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate trading signals based on strategy"""
        # In production, this would call the strategy service
        # For now, implement a simple moving average crossover strategy
        
        fast_period = parameters.get("fast_period", 10)
        slow_period = parameters.get("slow_period", 20)
        threshold = parameters.get("threshold", 0.01)
        
        # Calculate moving averages
        data['ma_fast'] = data['close'].rolling(window=fast_period).mean()
        data['ma_slow'] = data['close'].rolling(window=slow_period).mean()
        
        signals = []
        
        for i in range(1, len(data)):
            ma_fast_prev = data['ma_fast'].iloc[i-1]
            ma_slow_prev = data['ma_slow'].iloc[i-1]
            ma_fast_curr = data['ma_fast'].iloc[i]
            ma_slow_curr = data['ma_slow'].iloc[i]
            
            # Buy signal: fast MA crosses above slow MA
            if (ma_fast_prev <= ma_slow_prev and 
                ma_fast_curr > ma_slow_curr and
                abs(ma_fast_curr - ma_slow_curr) / ma_slow_curr > threshold):
                
                signals.append({
                    "type": "buy",
                    "strength": min(1.0, abs(ma_fast_curr - ma_slow_curr) / ma_slow_curr * 10),
                    "timestamp": data.index[i],
                    "price": data['close'].iloc[i],
                    "metadata": {
                        "ma_fast": ma_fast_curr,
                        "ma_slow": ma_slow_curr
                    }
                })
            
            # Sell signal: fast MA crosses below slow MA
            elif (ma_fast_prev >= ma_slow_prev and 
                  ma_fast_curr < ma_slow_curr and
                  abs(ma_fast_curr - ma_slow_curr) / ma_slow_curr > threshold):
                
                signals.append({
                    "type": "sell",
                    "strength": min(1.0, abs(ma_fast_curr - ma_slow_curr) / ma_slow_curr * 10),
                    "timestamp": data.index[i],
                    "price": data['close'].iloc[i],
                    "metadata": {
                        "ma_fast": ma_fast_curr,
                        "ma_slow": ma_slow_curr
                    }
                })
        
        return signals
    
    async def _execute_trades(self, data: pd.DataFrame, signals: List[Dict[str, Any]], initial_capital: float) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Execute trades based on signals"""
        trades = []
        equity_curve = []
        
        cash = initial_capital
        position = 0
        position_size = 0
        
        # Track equity for each day
        for date, row in data.iterrows():
            # Check for signals on this date
            for signal in signals:
                if signal["timestamp"].date() == date.date():
                    await self._process_signal(signal, cash, position, position_size, trades)
                    
                    # Update cash and position after trade
                    if trades:
                        last_trade = trades[-1]
                        if last_trade["type"] == "buy":
                            cash -= last_trade["total_cost"]
                            position = last_trade["quantity"]
                            position_size = last_trade["total_cost"]
                        elif last_trade["type"] == "sell" and position > 0:
                            cash += last_trade["total_proceeds"]
                            position = 0
                            position_size = 0
            
            # Calculate current equity
            current_value = cash + (position * row['close'] if position > 0 else 0)
            
            equity_curve.append({
                "date": date,
                "equity": current_value,
                "cash": cash,
                "position_value": position * row['close'] if position > 0 else 0,
                "returns": (current_value - initial_capital) / initial_capital
            })
        
        return trades, equity_curve
    
    async def _process_signal(self, signal: Dict[str, Any], cash: float, position: float, position_size: float, trades: List[Dict[str, Any]]):
        """Process a single trading signal"""
        signal_type = signal["type"]
        price = signal["price"]
        strength = signal["strength"]
        
        # Position sizing (use strength to determine size)
        if signal_type == "buy" and position == 0:
            # Use 95% of available cash, adjusted by signal strength
            trade_size = cash * 0.95 * strength
            
            # Calculate quantity and apply slippage
            execution_price = price * (1 + self.slippage_rate)
            quantity = trade_size / execution_price
            
            # Calculate commission
            commission = trade_size * self.commission_rate
            total_cost = trade_size + commission
            
            trades.append({
                "type": "buy",
                "timestamp": signal["timestamp"],
                "price": execution_price,
                "quantity": quantity,
                "commission": commission,
                "total_cost": total_cost,
                "signal_strength": strength,
                "metadata": signal.get("metadata", {})
            })
            
        elif signal_type == "sell" and position > 0:
            # Sell entire position
            execution_price = price * (1 - self.slippage_rate)
            total_proceeds = position * execution_price
            commission = total_proceeds * self.commission_rate
            net_proceeds = total_proceeds - commission
            
            # Calculate P&L
            pnl = net_proceeds - position_size
            pnl_percent = pnl / position_size
            
            trades.append({
                "type": "sell",
                "timestamp": signal["timestamp"],
                "price": execution_price,
                "quantity": position,
                "commission": commission,
                "total_proceeds": net_proceeds,
                "pnl": pnl,
                "pnl_percent": pnl_percent,
                "signal_strength": strength,
                "metadata": signal.get("metadata", {})
            })
    
    def _calculate_drawdown_periods(self, equity_curve: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate drawdown periods"""
        if not equity_curve:
            return []
        
        equity_values = [point["equity"] for point in equity_curve]
        peak = equity_values[0]
        drawdown_periods = []
        current_drawdown = None
        
        for i, value in enumerate(equity_values):
            if value > peak:
                peak = value
                
                # End current drawdown if any
                if current_drawdown:
                    current_drawdown["end_date"] = equity_curve[i]["date"]
                    current_drawdown["end_equity"] = value
                    current_drawdown["duration_days"] = (current_drawdown["end_date"] - current_drawdown["start_date"]).days
                    drawdown_periods.append(current_drawdown)
                    current_drawdown = None
            
            drawdown = (peak - value) / peak
            
            if drawdown > 0.01:  # Only track drawdowns > 1%
                if not current_drawdown:
                    current_drawdown = {
                        "start_date": equity_curve[i]["date"],
                        "start_equity": peak,
                        "max_drawdown": drawdown,
                        "min_equity": value
                    }
                else:
                    current_drawdown["max_drawdown"] = max(current_drawdown["max_drawdown"], drawdown)
                    current_drawdown["min_equity"] = min(current_drawdown["min_equity"], value)
        
        # Handle ongoing drawdown
        if current_drawdown:
            current_drawdown["end_date"] = equity_curve[-1]["date"]
            current_drawdown["end_equity"] = equity_curve[-1]["equity"]
            current_drawdown["duration_days"] = (current_drawdown["end_date"] - current_drawdown["start_date"]).days
            drawdown_periods.append(current_drawdown)
        
        return drawdown_periods
    
    def _calculate_monthly_returns(self, equity_curve: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate monthly returns"""
        if not equity_curve:
            return []
        
        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(equity_curve)
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        
        # Resample to monthly
        monthly_equity = df['equity'].resample('M').last()
        monthly_returns = monthly_equity.pct_change().dropna()
        
        result = []
        for date, ret in monthly_returns.items():
            result.append({
                "month": date.strftime("%Y-%m"),
                "return": ret,
                "equity": monthly_equity[date]
            })
        
        return result
    
    def _calculate_trade_distribution(self, trades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate trade distribution statistics"""
        if not trades:
            return {}
        
        # Separate winning and losing trades
        winning_trades = [t for t in trades if t.get("pnl", 0) > 0]
        losing_trades = [t for t in trades if t.get("pnl", 0) < 0]
        
        # Calculate statistics
        win_pnls = [t["pnl"] for t in winning_trades]
        loss_pnls = [abs(t["pnl"]) for t in losing_trades]
        
        distribution = {
            "total_trades": len(trades),
            "winning_trades": len(winning_trades),
            "losing_trades": len(losing_trades),
            "win_rate": len(winning_trades) / len(trades) if trades else 0,
            
            # Win statistics
            "avg_win": np.mean(win_pnls) if win_pnls else 0,
            "median_win": np.median(win_pnls) if win_pnls else 0,
            "largest_win": max(win_pnls) if win_pnls else 0,
            "smallest_win": min(win_pnls) if win_pnls else 0,
            
            # Loss statistics
            "avg_loss": np.mean(loss_pnls) if loss_pnls else 0,
            "median_loss": np.median(loss_pnls) if loss_pnls else 0,
            "largest_loss": max(loss_pnls) if loss_pnls else 0,
            "smallest_loss": min(loss_pnls) if loss_pnls else 0,
            
            # Profit factor
            "total_wins": sum(win_pnls),
            "total_losses": sum(loss_pnls),
            "profit_factor": sum(win_pnls) / sum(loss_pnls) if loss_pnls else float('inf')
        }
        
        return distribution
