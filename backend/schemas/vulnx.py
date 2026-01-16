"""
Pydantic schemas for Vulnx CLI wrapper.
"""

from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List
from datetime import datetime


class VulnxScanRequest(BaseModel):
    """Request to start a Vulnx scan."""
    
    dork: Optional[str] = Field(None, description='Google dork query (e.g., "inurl:index.php?id=")')
    target_url: Optional[HttpUrl] = Field(None, description="Direct target URL to scan")
    cms_name: Optional[str] = Field(None, description="CMS type: wordpress, joomla, drupal, prestashop")
    run_exploit: bool = Field(False, description="⚠️ DANGEROUS: Run exploits on targets")
    
    class Config:
        json_schema_extra = {
            "example": {
                "target_url": "https://example.com",
                "cms_name": "wordpress",
                "run_exploit": False
            }
        }


class VulnxScanResponse(BaseModel):
    """Response after starting a scan."""
    
    scan_id: str = Field(..., description="Unique scan identifier")
    status: str = Field(..., description="Scan status: running, completed, failed")
    command: str = Field(..., description="Executed vulnx command")
    output_folder: str = Field(..., description="Path to output folder")
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Scan start time")
    
    class Config:
        json_schema_extra = {
            "example": {
                "scan_id": "scan_abc123",
                "status": "running",
                "command": "vulnx -u https://example.com --cms wordpress -w ./outputs/scan_abc123",
                "output_folder": "./vulnx_outputs/scan_abc123",
                "started_at": "2026-01-08T12:00:00Z"
            }
        }


class VulnxScanStatus(BaseModel):
    """Status of a Vulnx scan."""
    
    scan_id: str
    status: str = Field(..., description="running, completed, failed, killed")
    is_active: bool = Field(..., description="Whether scan is currently running")
    output_folder: Optional[str] = None
    files: Optional[List[str]] = Field(None, description="Output files generated")


class VulnxLogLine(BaseModel):
    """Single log line from Vulnx output."""
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    scan_id: str
    line: str = Field(..., description="Log line content")
    line_number: int = Field(..., description="Sequential line number")
