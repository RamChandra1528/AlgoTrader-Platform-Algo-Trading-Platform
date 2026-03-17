from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from .database import Base

class OrderType(PyEnum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"

class OrderSide(PyEnum):
    BUY = "buy"
    SELL = "sell"

class OrderStatus(PyEnum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    FAILED = "failed"

class TimeInForce(PyEnum):
    DAY = "day"
    GTC = "gtc"  # Good Till Cancelled
    IOC = "ioc"   # Immediate Or Cancel
    FOK = "fok"   # Fill Or Kill

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    strategy_instance_id = Column(Integer, ForeignKey("strategy_instances.id"))
    symbol = Column(String, nullable=False, index=True)
    side = Column(Enum(OrderSide), nullable=False)
    order_type = Column(Enum(OrderType), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float)  # For limit orders
    stop_price = Column(Float)  # For stop orders
    time_in_force = Column(Enum(TimeInForce), default=TimeInForce.DAY)
    
    # Execution details
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    filled_quantity = Column(Float, default=0.0)
    filled_price = Column(Float)
    average_price = Column(Float)
    commission = Column(Float, default=0.0)
    
    # Timestamps
    submitted_at = Column(DateTime(timezone=True))
    filled_at = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Error handling
    error_message = Column(Text)
    
    # Relationships
    strategy_instance = relationship("StrategyInstance")
    executions = relationship("Execution", back_populates="order")

class Position(Base):
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False, index=True)
    quantity = Column(Float, nullable=False)  # Positive for long, negative for short
    side = Column(String, nullable=False)  # long or short
    
    # Cost basis and market value
    cost_basis = Column(Float, nullable=False)
    market_value = Column(Float)
    average_price = Column(Float)
    current_price = Column(Float)
    
    # P&L calculations
    unrealized_pnl = Column(Float, default=0.0)
    unrealized_pnl_percent = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    total_pnl = Column(Float, default=0.0)
    
    # Position management
    is_open = Column(Boolean, default=True)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True))
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    executions = relationship("Execution", back_populates="position")

class Execution(Base):
    __tablename__ = "executions"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    position_id = Column(Integer, ForeignKey("positions.id"))
    
    # Execution details
    symbol = Column(String, nullable=False)
    side = Column(Enum(OrderSide), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    
    # Cost calculations
    commission = Column(Float, default=0.0)
    slippage = Column(Float, default=0.0)
    total_cost = Column(Float)
    
    # P&L for position closing
    realized_pnl = Column(Float, default=0.0)
    
    # Timestamps
    execution_time = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Execution metadata
    exchange_execution_id = Column(String)
    liquidity_provider = Column(String)
    execution_venue = Column(String)
    
    # Relationships
    order = relationship("Order", back_populates="executions")
    position = relationship("Position", back_populates="executions")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_type = Column(String, default="paper")  # paper, live
    
    # Account balances
    cash_balance = Column(Float, nullable=False)
    buying_power = Column(Float)
    portfolio_value = Column(Float)
    total_pnl = Column(Float, default=0.0)
    
    # Account status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    orders = relationship("Order", back_populates="account")
    positions = relationship("Position", back_populates="account")
