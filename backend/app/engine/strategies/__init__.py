from app.engine.strategies.ma_crossover import MACrossoverStrategy
from app.engine.strategies.rsi_strategy import RSIStrategy

STRATEGY_MAP = {
    "ma_crossover": MACrossoverStrategy,
    "rsi": RSIStrategy,
}
