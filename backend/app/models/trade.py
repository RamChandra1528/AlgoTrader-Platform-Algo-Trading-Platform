from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)  # "buy" | "sell"
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    pnl = Column(Float, default=0.0)
    is_paper = Column(Boolean, default=True)
    executed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trades")
    strategy = relationship("Strategy", back_populates="trades")
