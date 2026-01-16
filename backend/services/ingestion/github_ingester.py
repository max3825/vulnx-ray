"""
Ingester for GitHub Security Advisories
"""

import httpx
from typing import List, Dict, Optional
from services.ingestion.base_ingester import BaseIngester


class GitHubIngester(BaseIngester):
    """Ingest CVEs from GitHub Security Advisories"""
    
    def __init__(self, db_session):
        super().__init__(db_session)
        self.source_name = "github"
        self.api_url = "https://api.github.com/advisories"
        # Using a public unauthenticated request for now, usually needs a token for higher rates
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    
    async def fetch_data(self) -> List[Dict]:
        """Fetch from GitHub API"""
        async with httpx.AsyncClient() as client:
            # Fetch recent published advisories
            params = {
                "per_page": 50,
                "sort": "published",
                "direction": "desc"
            }
            resp = await client.get(self.api_url, headers=self.headers, params=params)
            
            if resp.status_code != 200:
                self.logger.error(f"GitHub API Error: {resp.status_code}")
                return []
            return resp.json()
    
    async def parse_cve(self, advisory: Dict) -> Optional[Dict]:
        """Parse GitHub advisory into CVE format"""
        cve_id = advisory.get("cve_id")
        
        if not cve_id:
            # Some GHSAs don't have CVEs yet, we might skip them or handle them differently
            return None
        
        # Extract CVSS
        cvss_data = advisory.get("cvss", {})
        cvss_score = cvss_data.get("score") if cvss_data else None
        
        # Extract affected products
        affected = []
        for vuln in advisory.get("vulnerabilities", []):
            pkg = vuln.get("package", {})
            if pkg:
                affected.append(f"{pkg.get('name')} ({pkg.get('ecosystem')})")
        
        return {
            "cve_id": cve_id,
            "description": advisory.get("summary") or advisory.get("description"),
            "severity": (advisory.get("severity") or "").lower(),
            "cvss_score": cvss_score,
            "source_url": advisory.get("html_url"),
            "github_advisory_id": advisory.get("ghsa_id"),
            "affected_products_summary": ", ".join(affected[:5]),
            "quality_score": 9
        }
