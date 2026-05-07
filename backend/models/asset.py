from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean
from datetime import datetime
from database import Base

class Asset(Base):
    """
    User-defined asset to monitor and scan.
    """
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    target = Column(String, unique=True, index=True) # e.g. http://example.com or 192.168.1.1
    description = Column(String, nullable=True)
    
    tags = Column(JSON, default=[]) # e.g. ["prod", "web", "internal"]
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_scanned_at = Column(DateTime, nullable=True)
