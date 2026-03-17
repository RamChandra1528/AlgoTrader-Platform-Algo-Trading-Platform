from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class Backtest(Base):
    __tablename__ = "backtests"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    symbol = Column(String, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    initial_capital = Column(Float, nullable=False)
    parameters = Column(JSON, default=dict)
    
    # Status tracking
    status = Column(String, default="pending")  # pending, running, completed, failed
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="backtests")
    strategy = relationship("Strategy")
    result = relationship("BacktestResult", back_populates="backtest", uselist=False)

class BacktestResult(Base):
    __tablename__ = "backtest_results"
    
    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtests.id"), unique=True, nullable=False)
    
    # Performance metrics
    total_return = Column(Float, nullable=False)
    sharpe_ratio = Column(Float, nullable=False)
    sortino_ratio = Column(Float, nullable=False)
    max_drawdown = Column(Float, nullable=False)
    win_rate = Column(Float, nullable=False)
    profit_factor = Column(Float, nullable=False)
    cagr = Column(Float, nullable=False)
    
    # Trade statistics
    total_trades = Column(Integer, nullable=False)
    winning_trades = Column(Integer, nullable=False)
    losing_trades = Column(Integer, nullable=False)
    avg_win = Column(Float)
    avg_loss = Column(Float)
    largest_win = Column(Float)
    largest_loss = Column(Float)
    
    # Risk metrics
    var_95 = Column(Float)  # Value at Risk at 95% confidence
    calmar_ratio = Column(Float)
    kelly_criterion = Column(Float)
    
    # Detailed data (JSON)
    equity_curve = Column(JSON)
    trades = Column(JSON)
    drawdown_periods = Column(JSON)
    monthly_returns = Column(JSON)
    trade_distribution = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    backtest = relationship("Backtest", back_populates="result")
