from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Backtest(Base):
    __tablename__ = "backtests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    symbol = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    initial_capital = Column(Float, nullable=False, default=100000.0)
    final_value = Column(Float, default=0.0)
    total_return = Column(Float, default=0.0)
    sharpe_ratio = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    equity_curve = Column(JSON, default=[])
    trades_log = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="backtests")
    strategy = relationship("Strategy", back_populates="backtests")
