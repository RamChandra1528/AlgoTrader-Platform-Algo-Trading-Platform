import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import structlog
from scipy import stats

logger = structlog.get_logger()

class PerformanceCalculator:
    def __init__(self):
        self.risk_free_rate = 0.02  # 2% annual risk-free rate
        
    async def calculate_performance_metrics(self, trades: List[Dict[str, Any]], equity_curve: List[Dict[str, Any]], initial_capital: float) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics"""
        try:
            if not trades or not equity_curve:
                return self._empty_metrics()
            
            # Convert to DataFrames
            trades_df = pd.DataFrame(trades)
            equity_df = pd.DataFrame(equity_curve)
            
            # Basic metrics
            total_return = self._calculate_total_return(equity_df, initial_capital)
            sharpe_ratio = self._calculate_sharpe_ratio(equity_df)
            sortino_ratio = self._calculate_sortino_ratio(equity_df)
            max_drawdown = self._calculate_max_drawdown(equity_df)
            win_rate = self._calculate_win_rate(trades_df)
            profit_factor = self._calculate_profit_factor(trades_df)
            cagr = self._calculate_cagr(equity_df, initial_capital)
            
            # Trade statistics
            trade_stats = self._calculate_trade_statistics(trades_df)
            
            # Risk metrics
            risk_metrics = await self._calculate_risk_metrics(equity_df, trades_df)
            
            return {
                "total_return": total_return,
                "sharpe_ratio": sharpe_ratio,
                "sortino_ratio": sortino_ratio,
                "max_drawdown": max_drawdown,
                "win_rate": win_rate,
                "profit_factor": profit_factor,
                "cagr": cagr,
                **trade_stats,
                **risk_metrics
            }
            
        except Exception as e:
            logger.error("Performance calculation failed", error=str(e))
            return self._empty_metrics()
    
    async def calculate_detailed_metrics(self, trades: List[Dict[str, Any]], equity_curve: List[Dict[str, Any]], initial_capital: float) -> Dict[str, Any]:
        """Calculate detailed performance metrics for advanced analysis"""
        try:
            basic_metrics = await self.calculate_performance_metrics(trades, equity_curve, initial_capital)
            
            # Additional advanced metrics
            equity_df = pd.DataFrame(equity_curve)
            trades_df = pd.DataFrame(trades)
            
            # Market-related metrics (would need benchmark data)
            information_ratio = 0.0  # Placeholder
            beta = 1.0  # Placeholder
            alpha = 0.0  # Placeholder
            
            # Risk-adjusted metrics
            calmar_ratio = basic_metrics["cagr"] / abs(basic_metrics["max_drawdown"]) if basic_metrics["max_drawdown"] != 0 else 0
            var_95 = self._calculate_var(equity_df, 0.05)
            kelly_criterion = self._calculate_kelly_criterion(trades_df)
            
            # Capture ratios
            upside_capture, downside_capture = self._calculate_capture_ratios(equity_df)
            recovery_factor = basic_metrics["total_return"] / abs(basic_metrics["max_drawdown"]) if basic_metrics["max_drawdown"] != 0 else 0
            
            return {
                **basic_metrics,
                "calmar_ratio": calmar_ratio,
                "var_95": var_95,
                "kelly_criterion": kelly_criterion,
                "information_ratio": information_ratio,
                "beta": beta,
                "alpha": alpha,
                "upside_capture": upside_capture,
                "downside_capture": downside_capture,
                "recovery_factor": recovery_factor,
                "downside_deviation": self._calculate_downside_deviation(equity_df),
                "avg_trade_duration": self._calculate_avg_trade_duration(trades_df)
            }
            
        except Exception as e:
            logger.error("Detailed performance calculation failed", error=str(e))
            return {}
    
    def _empty_metrics(self) -> Dict[str, Any]:
        """Return empty metrics structure"""
        return {
            "total_return": 0.0,
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "max_drawdown": 0.0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "cagr": 0.0,
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "largest_win": 0.0,
            "largest_loss": 0.0,
            "var_95": 0.0,
            "calmar_ratio": 0.0,
            "kelly_criterion": 0.0
        }
    
    def _calculate_total_return(self, equity_df: pd.DataFrame, initial_capital: float) -> float:
        """Calculate total return"""
        if equity_df.empty:
            return 0.0
        
        final_equity = equity_df['equity'].iloc[-1]
        return (final_equity - initial_capital) / initial_capital
    
    def _calculate_sharpe_ratio(self, equity_df: pd.DataFrame) -> float:
        """Calculate Sharpe ratio"""
        if equity_df.empty or len(equity_df) < 2:
            return 0.0
        
        returns = equity_df['equity'].pct_change().dropna()
        
        if returns.empty or returns.std() == 0:
            return 0.0
        
        # Annualized Sharpe ratio
        excess_returns = returns - self.risk_free_rate / 252  # Daily risk-free rate
        return excess_returns.mean() / excess_returns.std() * np.sqrt(252)
    
    def _calculate_sortino_ratio(self, equity_df: pd.DataFrame) -> float:
        """Calculate Sortino ratio"""
        if equity_df.empty or len(equity_df) < 2:
            return 0.0
        
        returns = equity_df['equity'].pct_change().dropna()
        
        if returns.empty:
            return 0.0
        
        # Only consider downside deviation
        downside_returns = returns[returns < 0]
        
        if downside_returns.empty or downside_returns.std() == 0:
            return 0.0
        
        excess_returns = returns - self.risk_free_rate / 252
        return excess_returns.mean() / downside_returns.std() * np.sqrt(252)
    
    def _calculate_max_drawdown(self, equity_df: pd.DataFrame) -> float:
        """Calculate maximum drawdown"""
        if equity_df.empty:
            return 0.0
        
        equity_values = equity_df['equity'].values
        peak = equity_values[0]
        max_drawdown = 0.0
        
        for value in equity_values:
            if value > peak:
                peak = value
            drawdown = (peak - value) / peak
            max_drawdown = max(max_drawdown, drawdown)
        
        return max_drawdown
    
    def _calculate_win_rate(self, trades_df: pd.DataFrame) -> float:
        """Calculate win rate"""
        if trades_df.empty:
            return 0.0
        
        winning_trades = trades_df[trades_df['pnl'] > 0]
        return len(winning_trades) / len(trades_df)
    
    def _calculate_profit_factor(self, trades_df: pd.DataFrame) -> float:
        """Calculate profit factor"""
        if trades_df.empty:
            return 0.0
        
        winning_trades = trades_df[trades_df['pnl'] > 0]
        losing_trades = trades_df[trades_df['pnl'] < 0]
        
        total_wins = winning_trades['pnl'].sum() if not winning_trades.empty else 0
        total_losses = abs(losing_trades['pnl'].sum()) if not losing_trades.empty else 0
        
        return total_wins / total_losses if total_losses > 0 else float('inf')
    
    def _calculate_cagr(self, equity_df: pd.DataFrame, initial_capital: float) -> float:
        """Calculate Compound Annual Growth Rate"""
        if equity_df.empty or len(equity_df) < 2:
            return 0.0
        
        start_date = pd.to_datetime(equity_df['date'].iloc[0])
        end_date = pd.to_datetime(equity_df['date'].iloc[-1])
        final_equity = equity_df['equity'].iloc[-1]
        
        years = (end_date - start_date).days / 365.25
        if years <= 0:
            return 0.0
        
        return (final_equity / initial_capital) ** (1 / years) - 1
    
    def _calculate_trade_statistics(self, trades_df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate trade statistics"""
        if trades_df.empty:
            return {
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "avg_win": 0.0,
                "avg_loss": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0
            }
        
        winning_trades = trades_df[trades_df['pnl'] > 0]
        losing_trades = trades_df[trades_df['pnl'] < 0]
        
        return {
            "total_trades": len(trades_df),
            "winning_trades": len(winning_trades),
            "losing_trades": len(losing_trades),
            "avg_win": winning_trades['pnl'].mean() if not winning_trades.empty else 0.0,
            "avg_loss": losing_trades['pnl'].mean() if not losing_trades.empty else 0.0,
            "largest_win": winning_trades['pnl'].max() if not winning_trades.empty else 0.0,
            "largest_loss": losing_trades['pnl'].min() if not losing_trades.empty else 0.0
        }
    
    async def _calculate_risk_metrics(self, equity_df: pd.DataFrame, trades_df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate risk metrics"""
        returns = equity_df['equity'].pct_change().dropna()
        
        var_95 = self._calculate_var(equity_df, 0.05)
        kelly_criterion = self._calculate_kelly_criterion(trades_df)
        
        return {
            "var_95": var_95,
            "kelly_criterion": kelly_criterion
        }
    
    def _calculate_var(self, equity_df: pd.DataFrame, confidence_level: float) -> float:
        """Calculate Value at Risk"""
        if equity_df.empty:
            return 0.0
        
        returns = equity_df['equity'].pct_change().dropna()
        
        if returns.empty:
            return 0.0
        
        return np.percentile(returns, confidence_level * 100)
    
    def _calculate_kelly_criterion(self, trades_df: pd.DataFrame) -> float:
        """Calculate Kelly Criterion"""
        if trades_df.empty:
            return 0.0
        
        winning_trades = trades_df[trades_df['pnl'] > 0]
        losing_trades = trades_df[trades_df['pnl'] < 0]
        
        if winning_trades.empty or losing_trades.empty:
            return 0.0
        
        win_rate = len(winning_trades) / len(trades_df)
        avg_win = winning_trades['pnl'].mean()
        avg_loss = abs(losing_trades['pnl'].mean())
        
        # Kelly = (p * b - q) / b where b = avg_win/avg_loss, p = win_rate, q = loss_rate
        b = avg_win / avg_loss if avg_loss > 0 else 0
        q = 1 - win_rate
        
        if b == 0:
            return 0.0
        
        return (win_rate * b - q) / b
    
    def _calculate_capture_ratios(self, equity_df: pd.DataFrame) -> tuple[float, float]:
        """Calculate upside and downside capture ratios"""
        # Simplified calculation - would need benchmark data for proper calculation
        returns = equity_df['equity'].pct_change().dropna()
        
        if returns.empty:
            return 0.0, 0.0
        
        upside_returns = returns[returns > 0]
        downside_returns = returns[returns < 0]
        
        upside_capture = upside_returns.mean() if not upside_returns.empty else 0.0
        downside_capture = abs(downside_returns.mean()) if not downside_returns.empty else 0.0
        
        return upside_capture, downside_capture
    
    def _calculate_downside_deviation(self, equity_df: pd.DataFrame) -> float:
        """Calculate downside deviation"""
        if equity_df.empty:
            return 0.0
        
        returns = equity_df['equity'].pct_change().dropna()
        downside_returns = returns[returns < 0]
        
        if downside_returns.empty:
            return 0.0
        
        return downside_returns.std()
    
    def _calculate_avg_trade_duration(self, trades_df: pd.DataFrame) -> float:
        """Calculate average trade duration in days"""
        if trades_df.empty or 'timestamp' not in trades_df.columns:
            return 0.0
        
        # Convert timestamps to datetime
        trades_df['timestamp'] = pd.to_datetime(trades_df['timestamp'])
        
        # Pair buy and sell trades
        buy_trades = trades_df[trades_df['type'] == 'buy'].copy()
        sell_trades = trades_df[trades_df['type'] == 'sell'].copy()
        
        if buy_trades.empty or sell_trades.empty:
            return 0.0
        
        # Calculate durations (simplified - assumes chronological pairing)
        durations = []
        min_pairs = min(len(buy_trades), len(sell_trades))
        
        for i in range(min_pairs):
            buy_time = buy_trades.iloc[i]['timestamp']
            sell_time = sell_trades.iloc[i]['timestamp']
            duration = (sell_time - buy_time).days
            durations.append(duration)
        
        return np.mean(durations) if durations else 0.0
