"""
Nuclei Scanner Request/Response Schemas
"""

from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SeverityLevel(str, Enum):
    """Nuclei severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class NucleiScanRequest(BaseModel):
    """Request schema for starting a Nuclei scan"""
    target_url: HttpUrl = Field(..., description="Target URL to scan")
    severity: Optional[List[SeverityLevel]] = Field(
        default=None,
        description="Filter by severity levels (default: all)"
    )
    tags: Optional[List[str]] = Field(
        default=None,
        description="Filter by template tags (default: cve)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "target_url": "https://example.com",
                "severity": ["critical", "high"],
                "tags": ["cve"]
            }
        }


class NucleiScanResponse(BaseModel):
    """Response schema for scan initiation"""
    scan_id: str = Field(..., description="Unique scan identifier")
    status: str = Field(..., description="Scan status (pending, running, completed, failed)")
    command: str = Field(..., description="Actual command being executed")
    output_folder: str = Field(..., description="Folder where results are stored")
    started_at: datetime = Field(..., description="Scan start timestamp")


class NucleiScanStatus(BaseModel):
    """Schema for scan status"""
    scan_id: str
    status: str
    is_active: bool
    output_folder: Optional[str] = None
    findings: Optional[List[dict]] = None
