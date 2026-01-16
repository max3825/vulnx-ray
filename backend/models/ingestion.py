from sqlalchemy import Column, Integer, String, Text, JSON, TIMESTAMP, Boolean, Float
from sqlalchemy.sql import func
from database import Base


class CVESource(Base):
    """Track which sources have data for each CVE"""
    __tablename__ = "cve_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String(20), nullable=False, index=True)
    source_name = Column(String(50), nullable=False)  # 'nvd_rss', 'github', 'vulners', etc.
    source_url = Column(Text)
    last_updated = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    data_quality_score = Column(Integer)  # 1-10 rating
    
    __table_args__ = (
        {'extend_existing': True}
    )


class CVEEnrichment(Base):
    """Store additional metadata not in main CVE table"""
    __tablename__ = "cve_enrichments"
    
    id = Column(Integer, primary_key=True, index=True)
    cve_id = Column(String(20), unique=True, nullable=False, index=True)
    exploit_code_url = Column(Text)  # Link to exploit code
    patch_urls = Column(JSON)  # List of patch URLs
    vendor_advisories = Column(JSON)  # List of vendor advisory URLs
    workarounds = Column(Text)  # Textual workarounds
    exploit_maturity = Column(String(20))  # 'proof-of-concept', 'functional', 'high', 'weaponized'
    dark_web_mentions = Column(Integer, default=0)
    social_media_mentions = Column(Integer, default=0)
    first_seen = Column(TIMESTAMP, server_default=func.now())
    last_enriched = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        {'extend_existing': True}
    )


class IngestionJob(Base):
    """Track ingestion runs for monitoring"""
    __tablename__ = "ingestion_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(50), nullable=False, index=True)
    started_at = Column(TIMESTAMP, server_default=func.now())
    completed_at = Column(TIMESTAMP)
    status = Column(String(20))  # 'running', 'success', 'failed'
    cves_processed = Column(Integer, default=0)
    cves_added = Column(Integer, default=0)
    cves_updated = Column(Integer, default=0)
    error_message = Column(Text)
    
    __table_args__ = (
        {'extend_existing': True}
    )
