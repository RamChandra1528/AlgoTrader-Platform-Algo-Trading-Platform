from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class ServiceStatus(Base):
    __tablename__ = "service_statuses"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String, unique=True, nullable=False, index=True)
    status = Column(String, default="running", nullable=False)
    message = Column(String, nullable=True)
    last_heartbeat = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_restart_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
