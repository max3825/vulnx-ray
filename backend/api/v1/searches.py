"""
API endpoints for search history and saved searches
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from datetime import datetime

from database import get_db
from models.search import SearchHistory, SavedSearch
from schemas.search import (
    SearchHistoryCreate,
    SearchHistoryResponse,
    SearchHistoryList,
    SavedSearchCreate,
    SavedSearchUpdate,
    SavedSearchResponse,
    SavedSearchList
)

router = APIRouter(prefix="/searches", tags=["searches"])


# ============= SEARCH HISTORY ENDPOINTS =============

@router.post(
    "/history", 
    response_model=SearchHistoryResponse, 
    status_code=201,
    summary="Log Search History",
    description="Record a user's search query for analytics and history tracking.",
    response_description=" The created history entry."
)
async def log_search(
    history: SearchHistoryCreate,
    db: Session = Depends(get_db)
):
    """
    Log a search to history (auto-called after each search).
    """
    db_history = SearchHistory(
        query=history.query,
        filters=history.filters,
        results_count=history.results_count,
        execution_time_ms=history.execution_time_ms
    )
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history


@router.get(
    "/history", 
    response_model=SearchHistoryList,
    summary="Get Search History",
    description="Retrieve a list of past search queries executed by the user.",
    response_description="Paginated list of search history items."
)
async def get_search_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get search history (most recent first).
    """
    total = db.query(SearchHistory).count()
    items = db.query(SearchHistory).order_by(
        desc(SearchHistory.executed_at)
    ).offset(offset).limit(limit).all()
    
    return SearchHistoryList(total=total, items=items)


@router.delete(
    "/history", 
    status_code=204,
    summary="Clear Search History",
    description="Delete all search history entries.",
    response_description="No content."
)
async def clear_search_history(db: Session = Depends(get_db)):
    """
    Clear all search history.
    """
    db.query(SearchHistory).delete()
    db.commit()
    return


@router.delete(
    "/history/{history_id}", 
    status_code=204,
    summary="Delete History Entry",
    description="Delete a single search history entry by ID.",
    response_description="No content."
)
async def delete_history_entry(
    history_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific history entry.
    """
    db_history = db.query(SearchHistory).filter(SearchHistory.id == history_id).first()
    if not db_history:
        raise HTTPException(status_code=404, detail="History entry not found")
    
    db.delete(db_history)
    db.commit()
    return


# ============= SAVED SEARCHES ENDPOINTS =============

@router.post(
    "/saved", 
    response_model=SavedSearchResponse, 
    status_code=201,
    summary="Save Search",
    description="Save a specific complex search query (filters + query) for later use.",
    response_description="The saved search object."
)
async def save_search(
    search: SavedSearchCreate,
    db: Session = Depends(get_db)
):
    """
    Save a new search configuration.
    """
    # Check if name already exists
    existing = db.query(SavedSearch).filter(SavedSearch.name == search.name).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Saved search with name '{search.name}' already exists"
        )
    
    db_search = SavedSearch(
        name=search.name,
        description=search.description,
        query=search.query,
        filters=search.filters
    )
    db.add(db_search)
    db.commit()
    db.refresh(db_search)
    return db_search


@router.get(
    "/saved", 
    response_model=SavedSearchList,
    summary="List Saved Searches",
    description="Retrieve all saved searches. Supports filtering by favorites.",
    response_description="List of saved searches."
)
async def get_saved_searches(
    favorites_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Get all saved searches.
    """
    query = db.query(SavedSearch)
    
    if favorites_only:
        query = query.filter(SavedSearch.is_favorite == True)
    
    items = query.order_by(desc(SavedSearch.created_at)).all()
    total = len(items)
    
    return SavedSearchList(total=total, items=items)


@router.get(
    "/saved/{search_id}", 
    response_model=SavedSearchResponse,
    summary="Get Saved Search",
    description="Get details of a specific saved search.",
    response_description="Saved search details."
)
async def get_saved_search(
    search_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific saved search by ID.
    """
    db_search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
    if not db_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    return db_search


@router.put(
    "/saved/{search_id}", 
    response_model=SavedSearchResponse,
    summary="Update Saved Search",
    description="Update details of a saved search (name, description, filters, favorite status).",
    response_description="The updated saved search."
)
async def update_saved_search(
    search_id: int,
    update: SavedSearchUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a saved search.
    """
    db_search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
    if not db_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    # Update fields if provided
    if update.name is not None:
        # Check for duplicate names (excluding current search)
        existing = db.query(SavedSearch).filter(
            SavedSearch.name == update.name,
            SavedSearch.id != search_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Saved search with name '{update.name}' already exists"
            )
        db_search.name = update.name
    
    if update.description is not None:
        db_search.description = update.description
    
    if update.filters is not None:
        db_search.filters = update.filters
    
    if update.is_favorite is not None:
        db_search.is_favorite = update.is_favorite
    
    db.commit()
    db.refresh(db_search)
    return db_search


@router.delete(
    "/saved/{search_id}", 
    status_code=204,
    summary="Delete Saved Search",
    description="Permanently delete a saved search.",
    response_description="No content."
)
async def delete_saved_search(
    search_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a saved search.
    """
    db_search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
    if not db_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    db.delete(db_search)
    db.commit()
    return


@router.post(
    "/saved/{search_id}/execute",
    summary="Execute Saved Search",
    description="Execute a saved search. This endpoint also updates the usage count and last used timestamp for the saved search.",
    response_description="The filters required to execute the search on the frontend."
)
async def execute_saved_search(
    search_id: int,
    db: Session = Depends(get_db)
):
    """
    Execute a saved search and update usage statistics.
    """
    db_search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
    if not db_search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    # Update usage statistics
    db_search.use_count += 1
    db_search.last_used_at = datetime.utcnow()
    db.commit()
    
    # Return the filters to be used for search
    return {
        "status": "success",
        "search_id": search_id,
        "name": db_search.name,
        "filters": db_search.filters
    }
