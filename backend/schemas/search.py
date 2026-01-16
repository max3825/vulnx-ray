"""
Pydantic schemas for search history and saved searches
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List


# Search Filters Schema (reusable)
class SearchFilters(BaseModel):
    """Common search filter parameters."""
    query: Optional[str] = None
    severity: Optional[List[str]] = None
    cvss_score_min: Optional[float] = None
    cve_year: Optional[int] = None
    is_kev: Optional[bool] = None
    is_poc: Optional[bool] = None
    is_template: Optional[bool] = None
    is_remote: Optional[bool] = None
    limit: int = 50
    sort_by: str = "cvss_score"


# Search History Schemas
class SearchHistoryCreate(BaseModel):
    """Schema for creating search history entry."""
    query: Optional[str] = None
    filters: Dict[str, Any]
    results_count: int = 0
    execution_time_ms: Optional[int] = None


class SearchHistoryResponse(BaseModel):
    """Schema for search history response."""
    id: int
    query: Optional[str]
    filters: Dict[str, Any]
    results_count: int
    executed_at: datetime
    execution_time_ms: Optional[int]

    class Config:
        from_attributes = True


# Saved Search Schemas
class SavedSearchCreate(BaseModel):
    """Schema for creating a saved search."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    query: Optional[str] = None
    filters: Dict[str, Any]


class SavedSearchUpdate(BaseModel):
    """Schema for updating a saved search."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    filters: Optional[Dict[str, Any]] = None
    is_favorite: Optional[bool] = None


class SavedSearchResponse(BaseModel):
    """Schema for saved search response."""
    id: int
    name: str
    description: Optional[str]
    query: Optional[str]
    filters: Dict[str, Any]
    created_at: datetime
    last_used_at: Optional[datetime]
    use_count: int
    is_favorite: bool

    class Config:
        from_attributes = True


# List responses
class SearchHistoryList(BaseModel):
    """Schema for list of search history entries."""
    total: int
    items: List[SearchHistoryResponse]


class SavedSearchList(BaseModel):
    """Schema for list of saved searches."""
    total: int
    items: List[SavedSearchResponse]
