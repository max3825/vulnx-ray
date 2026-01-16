"""
Pydantic schemas for VulnX Search functionality.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class SeverityLevel(str, Enum):
    """CVE severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class VulnxSearchRequest(BaseModel):
    """Request for vulnx CVE search."""
    
    # Search query
    query: Optional[str] = Field(
        None,
        description="Search term (apache, wordpress, nginx, etc)",
        max_length=200
    )
    
    # Filters
    severity: Optional[List[SeverityLevel]] = Field(
        None,
        description="Severity levels to filter"
    )
    cvss_score_min: Optional[float] = Field(
        None,
        ge=0,
        le=10,
        description="Minimum CVSS score (0-10)"
    )
    epss_score_min: Optional[float] = Field(
        None,
        ge=0,
        le=1,
        description="Minimum EPSS score (0-1)"
    )
    cve_year: Optional[int] = Field(
        None,
        ge=1999,
        le=2030,
        description="CVE year (e.g., 2026)"
    )
    cpe: Optional[str] = Field(
        None,
        description="Common Platform Enumeration filter"
    )
    assigner: Optional[str] = Field(
        None,
        description="CVE Assigner filter (e.g. mitre)"
    )
    is_kev: Optional[bool] = Field(
        None,
        description="Known Exploited Vulnerabilities only"
    )
    is_poc: Optional[bool] = Field(
        None,
        description="Has Proof of Concept"
    )
    is_template: Optional[bool] = Field(
        None,
        description="Has Nuclei template"
    )
    is_remote: Optional[bool] = Field(
        None,
        description="Remotely exploitable"
    )
    
    # Search options
    limit: int = Field(
        50,
        ge=1,
        le=5000,  # Increased for export functionality
        description="Maximum number of results"
    )
    sort_by: str = Field(
        "cvss_score",
        description="Sort field (cvss_score, cve_created_at)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "wordpress",
                "severity": ["critical", "high"],
                "cvss_score_min": 7.0,
                "cve_year": 2026,
                "is_kev": True,
                "limit": 20
            }
        }


class CVEResult(BaseModel):
    """Individual CVE result."""
    cve_id: str
    severity: Optional[str] = None
    cvss_score: Optional[float] = None
    description: Optional[str] = None
    published_at: Optional[str] = None
    is_kev: bool = False
    is_poc: bool = False
    is_template: bool = False
    is_remote: bool = False
    affected_products: List[Dict[str, Any]] = []  # Changed from List[str] to match vulnx output
    cwe_ids: List[str] = []
    epss_score: Optional[float] = None
    references: List[str] = []


class VulnxSearchResponse(BaseModel):
    """Response from vulnx search."""
    status: str = "success"
    cves: List[CVEResult]
    total: int
    query_string: str
    filters_applied: Dict[str, Any] = {}
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CVEDetailResponse(BaseModel):
    """Detailed CVE information."""
    cve_id: str
    severity: Optional[str] = None
    cvss_metrics: Optional[Dict] = None
    description: Optional[str] = None
    published_at: Optional[str] = None
    updated_at: Optional[str] = None
    is_kev: bool = False
    is_poc: bool = False
    is_template: bool = False
    affected_products: List[Dict] = []
    cwe_ids: List[str] = []
    references: List[str] = []
    exploits: List[Dict] = []
    poc_links: List[str] = []
    nuclei_templates: List[str] = []


class SeverityStats(BaseModel):
    """CVE counts by severity."""
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class YearlyStats(BaseModel):
    """CVE counts by year."""
    year: int
    count: int


class DashboardStatsResponse(BaseModel):
    """Dashboard statistics response."""
    total_cves: int
    severity_distribution: SeverityStats
    yearly_trends: List[YearlyStats]
    kev_count: int
    poc_count: int
    remote_count: int
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FilterInfo(BaseModel):
    """Available filter information."""
    field_name: str
    data_type: str
    description: str
    examples: List[str] = []
    can_sort: bool = False
    facet_possible: bool = False

