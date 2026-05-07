from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class ScanHistory(Base):
    """
    Record of a Nuclei scan execution.
    """
    __tablename__ = "scan_history"

    id = Column(String, primary_key=True, index=True) # UUID
    target = Column(String, index=True)
    status = Column(String, default="running") # running, completed, failed, error
    error = Column(Text, nullable=True)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Store full configuration used
    config = Column(JSON, default={})
    
    findings = relationship("ScanFinding", back_populates="scan", cascade="all, delete-orphan")


class ScanFinding(Base):
    """
    Individual vulnerability/finding from a scan.
    """
    __tablename__ = "scan_findings"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String, ForeignKey("scan_history.id"), index=True)
    
    template_id = Column(String, index=True)
    name = Column(String)
    severity = Column(String, index=True) # critical, high, medium, low, info
    matched_at = Column(String)
    
    # Full raw JSON finding from nuclei
    raw_data = Column(JSON, default={})
    
    scan = relationship("ScanHistory", back_populates="findings")
