"""
Database models for search history and saved searches
"""

from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from database import Base


class SearchHistory(Base):
    """Model for tracking search history."""
    
    __tablename__ = "search_history"
    
    id = Column(Integer, primary_key=True, index=True)
    query = Column(String, nullable=True)
    filters = Column(JSON, nullable=False)  # Store all filter params as JSON
    results_count = Column(Integer, default=0)
    executed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    execution_time_ms = Column(Integer, nullable=True)
    
    def __repr__(self):
        return f"<SearchHistory(id={self.id}, query='{self.query}', results={self.results_count})>"


class SavedSearch(Base):
    """Model for user-saved searches."""
    
    __tablename__ = "saved_searches"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    query = Column(String, nullable=True)
    filters = Column(JSON, nullable=False)  # Store all filter params as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    use_count = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<SavedSearch(id={self.id}, name='{self.name}', use_count={self.use_count})>"
