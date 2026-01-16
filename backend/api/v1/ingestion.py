"""
API endpoints for data ingestion management
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from database import get_db
from services.ingestion.nvd_rss_ingester import NVDRSSIngester
from services.ingestion.github_ingester import GitHubIngester
from models.ingestion import IngestionJob, CVESource

router = APIRouter(tags=["ingestion"])
logger = logging.getLogger(__name__)


async def run_ingestion_task(source: str, db: Session):
    """Background task wrapper for ingestion"""
    # Note: In a real prod app with heavy load, use Celery/Redis
    # For now, FastAPI background tasks + sync DB session usage needs care
    # We instantiate ingester with a fresh session if possible or handle session scope carefully
    
    try:
        # Since BackgroundTasks runs after response, the dependency injected session might be closed
        # Ideally we create a new session here. 
        # For simplicity in this demo, we'll try using the passed one but this is fragile.
        # Better pattern: use a scoped session factory or context manager.
        
        # Let's instantiate correct ingester
        ingester = None
        if source == "nvd_rss":
            ingester = NVDRSSIngester(db)
        elif source == "github":
            ingester = GitHubIngester(db)
            
        if ingester:
            await ingester.ingest()
            
    except Exception as e:
        logger.error(f"Background ingestion failed for {source}: {e}")


@router.post("/run/{source}")
async def trigger_ingestion(
    source: str, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Trigger manual ingestion for a specific source
    Sources: 'nvd_rss', 'github'
    """
    valid_sources = ["nvd_rss", "github"]
    if source not in valid_sources:
        raise HTTPException(status_code=400, detail=f"Invalid source. Must be one of: {valid_sources}")
    
    # We'll run it in background
    # WARNING: Passing 'db' session to background task is risky as it closes after request
    # For this prototype, we'll run it AWAIT directly to ensure response reflects success/error
    # In production, use a proper task queue
    
    try:
        if source == "nvd_rss":
            ingester = NVDRSSIngester(db)
        elif source == "github":
            ingester = GitHubIngester(db)
            
        stats = await ingester.ingest()
        return {"status": "success", "message": f"Ingestion completed for {source}", "stats": stats}
        
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs")
def get_recent_jobs(limit: int = 10, db: Session = Depends(get_db)):
    """Get recent ingestion jobs"""
    jobs = db.query(IngestionJob).order_by(IngestionJob.started_at.desc()).limit(limit).all()
    return jobs


@router.get("/sources")
def get_sources_status(db: Session = Depends(get_db)):
    """Get status summary for all sources"""
    # This is a basic summary aggregation
    sources = db.query(CVESource.source_name).distinct().all()
    source_names = [s[0] for s in sources]
    
    summary = []
    for name in source_names:
        count = db.query(CVESource).filter(CVESource.source_name == name).count()
        last_job = db.query(IngestionJob).filter(
            IngestionJob.source_name == name,
            IngestionJob.status == 'success'
        ).order_by(IngestionJob.completed_at.desc()).first()
        
        summary.append({
            "name": name,
            "cve_count": count,
            "last_success": last_job.completed_at if last_job else None
        })
        
    return summary
