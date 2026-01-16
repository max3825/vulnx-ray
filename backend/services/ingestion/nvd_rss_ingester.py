"""
Ingester for NVD RSS feeds
"""

import asyncio
from typing import List, Dict, Optional
from datetime import datetime
import feedparser
from dateutil import parser as date_parser

from services.ingestion.base_ingester import BaseIngester


class NVDRSSIngester(BaseIngester):
    """Ingest CVEs from NVD RSS feed"""
    
    def __init__(self, db_session):
        super().__init__(db_session)
        self.source_name = "nvd_rss"
        self.feed_url = "https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml"
    
    async def fetch_data(self) -> List[Dict]:
        """Fetch RSS feed"""
        loop = asyncio.get_event_loop()
        # feedparser is blocking, run in executor
        feed = await loop.run_in_executor(None, feedparser.parse, self.feed_url)
        return feed.entries
    
    async def parse_cve(self, entry) -> Optional[Dict]:
        """Parse RSS entry into CVE format"""
        # Extract CVE ID from title (e.g., "CVE-2024-1234 (title text)")
        # NVD RSS titles usually look like: "CVE-2024-1234" or similar
        title_parts = entry.title.split()
        if not title_parts:
            return None
            
        cve_id = title_parts[0]
        if not cve_id.startswith("CVE-"):
            return None
        
        # Parse published date
        try:
            published_at = date_parser.parse(entry.published)
        except Exception:
            published_at = datetime.now()
            
        # Basic CVSS extraction logic could be added if description contains it
        # But usually NVD RSS description is just the vulnerability summary
        
        cvss_score = self._extract_cvss_from_description(entry.summary)
        
        return {
            "cve_id": cve_id,
            "description": entry.summary,
            "published_at": published_at,
            "cvss_score": cvss_score,
            "severity": self.calculate_severity(cvss_score),
            "source_url": entry.link,
            "references": [link.href for link in entry.get('links', []) if link.get('href')],
            "quality_score": 8
        }
        
    def _extract_cvss_from_description(self, description: str) -> Optional[float]:
        """Attempt to extract CVSS score if present in description text"""
        # NVD RSS descriptions are often just text. 
        # Sometimes they might include metrics, but typically not in a structured way in the RSS.
        # This is a placeholder for regex logic if patterns emerge.
        return None
