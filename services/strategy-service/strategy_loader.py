import os
import importlib.util
import inspect
from typing import Dict, List, Any, Optional
import structlog
from abc import ABC, abstractmethod

logger = structlog.get_logger()

class BaseStrategy(ABC):
    """Base class for all trading strategies"""
    
    def __init__(self, parameters: Dict[str, Any] = None):
        self.parameters = parameters or {}
        self.name = self.__class__.__name__
        self.description = self.__doc__ or "No description available"
        
    @abstractmethod
    def generate_signals(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate trading signals based on market data"""
        pass
    
    @abstractmethod
    def calculate_indicators(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate technical indicators"""
        pass
    
    def validate_parameters(self) -> bool:
        """Validate strategy parameters"""
        return True
    
    def get_required_data_fields(self) -> List[str]:
        """Return list of required data fields"""
        return ["close", "volume"]

class StrategyLoader:
    def __init__(self):
        self.loaded_strategies: Dict[str, BaseStrategy] = {}
        self.builtin_strategies_dir = "strategies/builtin"
        self.custom_strategies_dir = "strategies/custom"
        
        # Create directories if they don't exist
        os.makedirs(self.builtin_strategies_dir, exist_ok=True)
        os.makedirs(self.custom_strategies_dir, exist_ok=True)
    
    async def load_builtin_strategies(self):
        """Load all built-in strategies"""
        await self._create_builtin_strategies()
        
        for filename in os.listdir(self.builtin_strategies_dir):
            if filename.endswith('.py') and not filename.startswith('__'):
                file_path = os.path.join(self.builtin_strategies_dir, filename)
                await self._load_strategy_file(file_path, builtin=True)
    
    async def load_custom_strategy(self, file_path: str) -> Dict[str, Any]:
        """Load a custom strategy from file"""
        return await self._load_strategy_file(file_path, builtin=False)
    
    async def _load_strategy_file(self, file_path: str, builtin: bool) -> Dict[str, Any]:
        """Load strategy from Python file"""
        try:
            spec = importlib.util.spec_from_file_location("strategy_module", file_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find strategy classes
            strategy_classes = []
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    issubclass(obj, BaseStrategy) and 
                    obj != BaseStrategy):
                    strategy_classes.append(obj)
            
            if not strategy_classes:
                raise ValueError("No strategy classes found in file")
            
            # Load first strategy class found
            strategy_class = strategy_classes[0]
            strategy_instance = strategy_class()
            
            strategy_info = {
                "name": strategy_instance.name,
                "description": strategy_instance.description,
                "class_name": strategy_class.__name__,
                "file_path": file_path,
                "is_builtin": builtin,
                "parameters": getattr(strategy_class, "DEFAULT_PARAMETERS", {}),
                "required_fields": strategy_instance.get_required_data_fields()
            }
            
            self.loaded_strategies[strategy_instance.name] = strategy_instance
            
            logger.info("Strategy loaded", 
                       name=strategy_instance.name, 
                       builtin=builtin)
            
            return strategy_info
            
        except Exception as e:
            logger.error("Failed to load strategy", file_path=file_path, error=str(e))
            raise
    
    async def _create_builtin_strategies(self):
        """Create built-in strategy files"""
        # Moving Average Crossover Strategy
        ma_crossover_code = '''
import pandas as pd
import numpy as np
from strategy_loader import BaseStrategy

class MovingAverageCrossover(BaseStrategy):
    """Moving Average Crossover Strategy"""
    
    DEFAULT_PARAMETERS = {
        "fast_period": 10,
        "slow_period": 20,
        "threshold": 0.01
    }
    
    def calculate_indicators(self, data: dict) -> dict:
        df = pd.DataFrame(data)
        
        fast_period = self.parameters.get("fast_period", 10)
        slow_period = self.parameters.get("slow_period", 20)
        
        df['ma_fast'] = df['close'].rolling(window=fast_period).mean()
        df['ma_slow'] = df['close'].rolling(window=slow_period).mean()
        
        return df.to_dict('list')
    
    def generate_signals(self, data: dict) -> list:
        indicators = self.calculate_indicators(data)
        df = pd.DataFrame(indicators)
        
        signals = []
        threshold = self.parameters.get("threshold", 0.01)
        
        for i in range(1, len(df)):
            ma_fast_prev = df['ma_fast'].iloc[i-1]
            ma_slow_prev = df['ma_slow'].iloc[i-1]
            ma_fast_curr = df['ma_fast'].iloc[i]
            ma_slow_curr = df['ma_slow'].iloc[i]
            
            # Buy signal: fast MA crosses above slow MA
            if (ma_fast_prev <= ma_slow_prev and 
                ma_fast_curr > ma_slow_curr and
                abs(ma_fast_curr - ma_slow_curr) / ma_slow_curr > threshold):
                
                signals.append({
                    "type": "buy",
                    "strength": min(1.0, abs(ma_fast_curr - ma_slow_curr) / ma_slow_curr * 10),
                    "timestamp": df.index[i],
                    "price": df['close'].iloc[i],
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
                    "timestamp": df.index[i],
                    "price": df['close'].iloc[i],
                    "metadata": {
                        "ma_fast": ma_fast_curr,
                        "ma_slow": ma_slow_curr
                    }
                })
        
        return signals
'''
        
        # RSI Strategy
        rsi_code = '''
import pandas as pd
import numpy as np
from strategy_loader import BaseStrategy

class RSIStrategy(BaseStrategy):
    """RSI Mean Reversion Strategy"""
    
    DEFAULT_PARAMETERS = {
        "period": 14,
        "oversold": 30,
        "overbought": 70
    }
    
    def calculate_indicators(self, data: dict) -> dict:
        df = pd.DataFrame(data)
        
        period = self.parameters.get("period", 14)
        
        # Calculate RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        return df.to_dict('list')
    
    def generate_signals(self, data: dict) -> list:
        indicators = self.calculate_indicators(data)
        df = pd.DataFrame(indicators)
        
        signals = []
        oversold = self.parameters.get("oversold", 30)
        overbought = self.parameters.get("overbought", 70)
        
        for i in range(1, len(df)):
            rsi_curr = df['rsi'].iloc[i]
            rsi_prev = df['rsi'].iloc[i-1]
            
            # Buy signal: RSI crosses above oversold
            if rsi_prev <= oversold and rsi_curr > oversold:
                strength = (oversold - rsi_prev) / oversold
                signals.append({
                    "type": "buy",
                    "strength": min(1.0, strength),
                    "timestamp": df.index[i],
                    "price": df['close'].iloc[i],
                    "metadata": {
                        "rsi": rsi_curr
                    }
                })
            
            # Sell signal: RSI crosses below overbought
            elif rsi_prev >= overbought and rsi_curr < overbought:
                strength = (rsi_prev - overbought) / (100 - overbought)
                signals.append({
                    "type": "sell",
                    "strength": min(1.0, strength),
                    "timestamp": df.index[i],
                    "price": df['close'].iloc[i],
                    "metadata": {
                        "rsi": rsi_curr
                    }
                })
        
        return signals
'''
        
        # Write strategy files
        strategies = [
            ("moving_average_crossover.py", ma_crossover_code),
            ("rsi_strategy.py", rsi_code)
        ]
        
        for filename, code in strategies:
            file_path = os.path.join(self.builtin_strategies_dir, filename)
            if not os.path.exists(file_path):
                with open(file_path, 'w') as f:
                    f.write(code)
    
    async def get_available_strategies(self) -> List[Dict[str, Any]]:
        """Get list of all available strategies"""
        strategies = []
        
        for name, strategy in self.loaded_strategies.items():
            strategies.append({
                "name": name,
                "description": strategy.description,
                "parameters": getattr(strategy.__class__, "DEFAULT_PARAMETERS", {}),
                "required_fields": strategy.get_required_data_fields()
            })
        
        return strategies
    
    def get_strategy(self, name: str) -> Optional[BaseStrategy]:
        """Get strategy instance by name"""
        return self.loaded_strategies.get(name)
    
    async def reload_strategy(self, name: str) -> bool:
        """Reload a strategy"""
        if name not in self.loaded_strategies:
            return False
        
        # Implementation would depend on tracking file paths
        # For now, just return True
        return True
