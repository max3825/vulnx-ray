"""
Base abstract class for all data ingesters
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from datetime import datetime
import logging
from sqlalchemy.orm import Session

from models.ingestion import IngestionJob, CVESource


class BaseIngester(ABC):
    """Abstract base class for all data ingesters"""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(self.__class__.__name__)
        self.source_name = ""
        self.current_job: Optional[IngestionJob] = None
    
    @abstractmethod
    async def fetch_data(self) -> List[Dict]:
        """
        Fetch raw data from the source
        
        Returns:
            List of raw data dictionaries
        """
        pass
    
    @abstractmethod
    async def parse_cve(self, raw_data: Dict) -> Optional[Dict]:
        """
        Parse raw data into standardized CVE format
        
        Args:
            raw_data: Raw data from source
            
        Returns:
            Parsed CVE dictionary or None if invalid
        """
        pass
    
    def create_job(self) -> IngestionJob:
        """Create a new ingestion job record"""
        job = IngestionJob(
            source_name=self.source_name,
            status="running"
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        self.current_job = job
        self.logger.info(f"Created ingestion job #{job.id} for {self.source_name}")
        return job
    
    def complete_job(
        self, 
        job: IngestionJob, 
        status: str, 
        stats: Optional[Dict[str, int]] = None,
        error: Optional[str] = None
    ):
        """Mark ingestion job as complete"""
        job.status = status
        job.completed_at = datetime.now()
        
        if stats:
            job.cves_processed = stats.get("processed", 0)
            job.cves_added = stats.get("added", 0)
            job.cves_updated = stats.get("updated", 0)
        
        if error:
            job.error_message = error
        
        self.db.commit()
        self.logger.info(
            f"Completed job #{job.id}: {status} - "
            f"Processed: {job.cves_processed}, Added: {job.cves_added}, Updated: {job.cves_updated}"
        )
    
    async def save_cve(self, cve_data: Dict) -> str:
        """
        Save or update CVE in database
        
        Args:
            cve_data: Parsed CVE data
            
        Returns:
            'added', 'updated', or 'skipped'
        """
        if not cve_data or not cve_data.get("cve_id"):
            return "skipped"
        
        cve_id = cve_data["cve_id"]
        
        # Check if CVE exists
        # This is a simplified version - in reality you'd check your CVE table
        # For now, we just track the source
        
        # Record source
        existing_source = self.db.query(CVESource).filter(
            CVESource.cve_id == cve_id,
            CVESource.source_name == self.source_name
        ).first()
        
        if existing_source:
            existing_source.source_url = cve_data.get("source_url")
            existing_source.last_updated = datetime.now()
            result = "updated"
        else:
            new_source = CVESource(
                cve_id=cve_id,
                source_name=self.source_name,
                source_url=cve_data.get("source_url"),
                data_quality_score=cve_data.get("quality_score", 7)
            )
            self.db.add(new_source)
            result = "added"
        
        try:
            self.db.commit()
            return result
        except Exception as e:
            self.logger.error(f"Failed to save CVE {cve_id}: {e}")
            self.db.rollback()
            return "skipped"
    
    async def ingest(self) -> Dict[str, int]:
        """
        Main ingestion flow
        
        Returns:
            Statistics dictionary with processed, added, updated counts
        """
        job = self.create_job()
        
        try:
            # Fetch raw data
            self.logger.info(f"Fetching data from {self.source_name}...")
            raw_data = await self.fetch_data()
            self.logger.info(f"Fetched {len(raw_data)} records from {self.source_name}")
            
            stats = {"processed": 0, "added": 0, "updated": 0}
            
            for item in raw_data:
                try:
                    cve_data = await self.parse_cve(item)
                    
                    if not cve_data:
                        continue
                    
                    result = await self.save_cve(cve_data)
                    
                    stats["processed"] += 1
                    if result == "added":
                        stats["added"] += 1
                    elif result == "updated":
                        stats["updated"] += 1
                        
                except Exception as e:
                    self.logger.error(f"Failed to process item: {e}")
                    continue
            
            self.complete_job(job, "success", stats)
            return stats
            
        except Exception as e:
            self.logger.error(f"Ingestion failed: {e}", exc_info=True)
            self.complete_job(job, "failed", error=str(e))
            raise
    
    def calculate_severity(self, cvss_score: Optional[float]) -> Optional[str]:
        """Calculate severity from CVSS score"""
        if cvss_score is None:
            return None
        
        if cvss_score >= 9.0:
            return "critical"
        elif cvss_score >= 7.0:
            return "high"
        elif cvss_score >= 4.0:
            return "medium"
        else:
            return "low"
