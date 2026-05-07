"""
Ingester for NVD CVE API v2 (replaces deprecated RSS feeds)
"""

import httpx
from typing import List, Dict, Optional
from datetime import datetime, timezone

from services.ingestion.base_ingester import BaseIngester


class NVDRSSIngester(BaseIngester):
    """Ingest CVEs from NVD CVE REST API v2"""

    def __init__(self, db_session):
        super().__init__(db_session)
        self.source_name = "nvd_rss"
        # NVD retired all RSS/XML feeds in Dec 2023 - now uses REST API v2
        self.api_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"

    async def fetch_data(self) -> List[Dict]:
        """Fetch recent CVEs from NVD API v2"""
        async with httpx.AsyncClient(timeout=30) as client:
            params = {
                "resultsPerPage": 50,
                "startIndex": 0,
            }
            try:
                resp = await client.get(self.api_url, params=params)
                if resp.status_code != 200:
                    self.logger.error(f"NVD API Error: {resp.status_code} - {resp.text[:200]}")
                    return []
                data = resp.json()
                return data.get("vulnerabilities", [])
            except Exception as e:
                self.logger.error(f"Failed to fetch NVD data: {e}")
                return []

    async def parse_cve(self, item: Dict) -> Optional[Dict]:
        """Parse NVD API v2 item into CVE format"""
        cve = item.get("cve", {})
        if not cve:
            return None

        cve_id = cve.get("id")
        if not cve_id or not cve_id.startswith("CVE-"):
            return None

        # Extract description (English preferred)
        descriptions = cve.get("descriptions", [])
        description = next(
            (d["value"] for d in descriptions if d.get("lang") == "en"),
            descriptions[0]["value"] if descriptions else ""
        )

        # Extract CVSS score (prefer v3.1 > v3.0 > v2)
        cvss_score = None
        metrics = cve.get("metrics", {})
        for key in ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]:
            entries = metrics.get(key, [])
            if entries:
                data = entries[0].get("cvssData", {})
                cvss_score = data.get("baseScore")
                break

        # Published date
        published_str = cve.get("published", "")
        try:
            published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
        except Exception:
            published_at = datetime.now(timezone.utc)

        # References
        refs = [r.get("url") for r in cve.get("references", []) if r.get("url")]

        return {
            "cve_id": cve_id,
            "description": description,
            "published_at": published_at,
            "cvss_score": cvss_score,
            "severity": self.calculate_severity(cvss_score),
            "source_url": f"https://nvd.nist.gov/vuln/detail/{cve_id}",
            "references": refs[:5],
            "quality_score": 8,
        }
