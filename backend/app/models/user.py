from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    is_trading_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    starting_balance = Column(Float, default=100000.0, nullable=False)
    cash_balance = Column(Float, default=100000.0, nullable=False)
    max_trade_amount = Column(Float, default=5000.0, nullable=False)
    daily_loss_limit = Column(Float, default=5000.0, nullable=False)
    max_trades_per_day = Column(Integer, default=20, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    strategies = relationship("Strategy", back_populates="user")
    trades = relationship("Trade", back_populates="user")
    positions = relationship("Position", back_populates="user")
    backtests = relationship("Backtest", back_populates="user")
