from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String

from app.database import Base


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(Integer, primary_key=True, index=True)
    singleton_key = Column(String, unique=True, nullable=False, default="default")
    system_running = Column(Boolean, default=True, nullable=False)
    trading_enabled = Column(Boolean, default=True, nullable=False)
    market_data_enabled = Column(Boolean, default=True, nullable=False)
    global_stop_loss_limit = Column(Float, default=25000.0, nullable=False)
    default_max_trade_amount = Column(Float, default=5000.0, nullable=False)
    default_daily_loss_limit = Column(Float, default=5000.0, nullable=False)
    default_max_trades_per_day = Column(Integer, default=20, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
