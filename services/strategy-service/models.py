from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from .database import Base

class StrategyType(PyEnum):
    MOMENTUM = "momentum"
    MEAN_REVERSION = "mean_reversion"
    ARBITRAGE = "arbitrage"
    TREND_FOLLOWING = "trend_following"
    CUSTOM = "custom"

class Strategy(Base):
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    strategy_type = Column(Enum(StrategyType), nullable=False)
    code = Column(Text, nullable=False)  # Python code for the strategy
    parameters = Column(JSON, default=dict)  # Strategy parameters
    is_active = Column(Boolean, default=True, nullable=False)
    is_builtin = Column(Boolean, default=False, nullable=False)
    
    # Performance metrics
    total_return = Column(Float, default=0.0)
    sharpe_ratio = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="strategies")
    instances = relationship("StrategyInstance", back_populates="strategy")

class StrategyInstance(Base):
    __tablename__ = "strategy_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    name = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    status = Column(String, default="stopped")  # running, stopped, error
    parameters = Column(JSON, default=dict)
    
    # Execution details
    started_at = Column(DateTime(timezone=True))
    stopped_at = Column(DateTime(timezone=True))
    last_execution = Column(DateTime(timezone=True))
    
    # Performance tracking
    current_pnl = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    strategy = relationship("Strategy", back_populates="instances")
    trades = relationship("Trade", back_populates="strategy_instance")

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    strategy_instance_id = Column(Integer, ForeignKey("strategy_instances.id"), nullable=False)
    symbol = Column(String, nullable=False)
    side = Column(String, nullable=False)  # buy, sell
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    
    # Trade lifecycle
    status = Column(String, default="open")  # open, closed, cancelled
    entry_time = Column(DateTime(timezone=True), server_default=func.now())
    exit_time = Column(DateTime(timezone=True))
    exit_price = Column(Float)
    
    # P&L calculation
    pnl = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    
    # Strategy signals
    entry_signal = Column(Text)
    exit_signal = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    strategy_instance = relationship("StrategyInstance", back_populates="trades")
