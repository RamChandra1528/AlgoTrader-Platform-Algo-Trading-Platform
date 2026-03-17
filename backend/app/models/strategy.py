from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    strategy_type = Column(String, nullable=False)  # "ma_crossover" | "rsi"
    parameters = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="strategies")
    trades = relationship("Trade", back_populates="strategy")
    backtests = relationship("Backtest", back_populates="strategy")
