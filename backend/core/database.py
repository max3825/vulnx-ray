"""
Database models for OSINT Intelligence Campaigns.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, JSON, Integer, Text
from datetime import datetime
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)

# SQLite database URL
DATABASE_URL = "sqlite+aiosqlite:///./vulnxray.db"

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


class IntelligenceCampaign(Base):
    """Database model for OSINT intelligence campaigns."""
    __tablename__ = "intelligence_campaigns"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    query_string: Mapped[str] = mapped_column(String(500), nullable=False)
    engines_used: Mapped[str] = mapped_column(JSON, nullable=False)  # List of engine names
    results_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    detected_urls: Mapped[str] = mapped_column(JSON, nullable=True)  # List of DiscoveredURL objects
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    def __repr__(self) -> str:
        return f"<IntelligenceCampaign(campaign_id={self.campaign_id}, query={self.query_string}, results={self.results_count})>"


# Legacy scan record table (keep for backward compatibility)
class ScanRecord(Base):
    """Legacy database model for storing scan results."""
    __tablename__ = "scan_records"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    cms_detected: Mapped[str] = mapped_column(String(50), nullable=False)
    cms_version: Mapped[str] = mapped_column(String(50), nullable=True)
    server_tech: Mapped[str] = mapped_column(String(200), nullable=False)
    vulnerabilities_json: Mapped[str] = mapped_column(JSON, nullable=True)
    scan_duration: Mapped[float] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self) -> str:
        return f"<ScanRecord(scan_id={self.scan_id}, target={self.target_url}, cms={self.cms_detected})>"


async def init_db():
    """Initialize database tables."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting database sessions.
    
    Usage:
        @app.get("/something")
        async def endpoint(db: AsyncSession = Depends(get_db_session)):
            # use db here
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
