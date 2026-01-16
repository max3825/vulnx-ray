from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class AlertRule(Base):
    """
    User-defined usage rule for CVE monitoring.
    """
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    
    # JSON field storing filter criteria (severity, vendor, keywords, etc.)
    # Example: {"severity": ["critical"], "keywords": ["wordpress"], "is_kev": true}
    filters = Column(JSON, default={})
    
    is_active = Column(Boolean, default=True)
    
    # Notification preferences
    emails = Column(JSON, default=[])  # List of email strings
    webhook_url = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_triggered_at = Column(DateTime, nullable=True)
    
    history = relationship("AlertHistory", back_populates="rule", cascade="all, delete-orphan")


class AlertHistory(Base):
    """
    Log of sent notifications to prevent duplicates.
    """
    __tablename__ = "alert_history"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("alert_rules.id"))
    
    cve_id = Column(String, index=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    
    rule = relationship("AlertRule", back_populates="history")
