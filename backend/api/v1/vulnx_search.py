"""
VulnX Search API endpoints (ProjectDiscovery vulnx CLI wrapper).
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
import logging
import csv
import io
import json
from datetime import datetime

from schemas.vulnx_search import (
    VulnxSearchRequest,
    VulnxSearchResponse,
    CVEDetailResponse,
    CVEResult,
    DashboardStatsResponse
)
from services.vulnx_search_wrapper import vulnx_wrapper

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/search",
    response_model=VulnxSearchResponse,
    status_code=200,
    summary="Search CVEs",
    description="Advanced search for Common Vulnerabilities and Exposures (CVEs) using filters like severity, CVSS score, and various flags (KEV, PoC).",
    response_description="List of matching CVEs with pagination metadata."
)
async def search_cves(request: VulnxSearchRequest):
    """
    **Search CVEs**

    Perform a complex search query against the vulnerability database.
    
    - **query**: Text search (e.g., "wordpress", "apache").
    - **severity**: Filter by severity level (critical, high, etc.).
    - **is_kev**: Only return Known Exploited Vulnerabilities.
    - **cvss_score_min**: Minimum CVSS score.
    """
    try:
        logger.info(f"CVE search request: {request.query or 'all'}")
        
        # Execute vulnx search
        result = await vulnx_wrapper.search(
            query=request.query,
            severity=[s.value for s in request.severity] if request.severity else None,
            cvss_score_min=request.cvss_score_min,
            epss_score_min=request.epss_score_min,
            cve_year=request.cve_year,
            cpe=request.cpe,
            assigner=request.assigner,
            is_kev=request.is_kev,
            is_poc=request.is_poc,
            is_template=request.is_template,
            is_remote=request.is_remote,
            limit=request.limit,
            sort_by=request.sort_by
        )
        
        # Convert to CVEResult models
        cves = [CVEResult(**cve) for cve in result.get('cves', [])]
        
        return VulnxSearchResponse(
            status="success" if not result.get('error') else "error",
            cves=cves,
            total=result.get('total', 0),
            query_string=result.get('query_string', ''),
            filters_applied={
                k: v for k, v in request.dict().items()
                if v is not None and k not in ['limit', 'sort_by']
            },
            error=result.get('error')
        )
    
    except Exception as e:
        logger.error(f"CVE search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@router.get(
    "/cve/{cve_id}",
    response_model=CVEDetailResponse,
    summary="Get CVE Details",
    description="Retrieve comprehensive details for a specific CVE, including description, severity, affected products, and reference links.",
    response_description="Detailed CVE object."
)
async def get_cve_details(cve_id: str):
    """
    **Get CVE Details**
    
    Fetch full metadata for a single CVE ID.
    
    - **cve_id**: Standard CVE Identifier (e.g., `CVE-2021-44228`).
    """
    try:
        logger.info(f"Getting CVE details: {cve_id}")
        
        details = await vulnx_wrapper.get_cve_details(cve_id)
        
        return CVEDetailResponse(**details)
    
    except Exception as e:
        logger.error(f"Failed to get CVE details: {e}")
        raise HTTPException(
            status_code=404,
            detail=f"CVE not found or error: {str(e)}"
        )


@router.get("/filters")
async def list_available_filters():
    """
    List all available search filters from vulnx.
    
    Returns:
        List of filter information
    """
    try:
        filters = await vulnx_wrapper.list_filters()
        return {
            "filters": filters,
            "count": len(filters)
        }
    except Exception as e:
        logger.error(f"Failed to list filters: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list filters: {str(e)}"
        )


@router.get("/test")
async def test_vulnx_installation():
    """
    Test vulnx installation and availability.
    
    Returns:
        Installation status
    """
    try:
        # Check if vulnx is available
        health = await vulnx_wrapper.healthcheck()
        
        return {
            "installed": True,
            "path": vulnx_wrapper.vulnx_path,
            "healthy": health.get('healthy', False),
            "version": health.get('version', 'unknown')
        }
    except FileNotFoundError as e:
        return {
            "installed": False,
            "error": str(e),
            "install_command": "go install github.com/projectdiscovery/cvemap/cmd/vulnx@latest"
        }
    except Exception as e:
        logger.error(f"Healthcheck failed: {e}")
        return {
            "installed": True,
            "healthy": False,
            "error": str(e)
        }


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_search_stats():
    """
    Get statistics about available CVEs for the dashboard.
    
    Returns:
        Aggregated statistics (counts, trends, distribution)
    """
    try:
        stats = await vulnx_wrapper.get_dashboard_stats()
        return DashboardStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stats: {str(e)}"
        )


@router.post("/export/csv")
async def export_cves_csv(request: VulnxSearchRequest):
    """
    Export CVE search results as CSV file.
    
    Uses the same filters as the search endpoint but returns a downloadable CSV.
    
    Returns:
        CSV file download
    """
    try:
        logger.info(f"CSV export request: {request.query or 'all'}")
        
        # Execute search with higher limit for export
        result = await vulnx_wrapper.search(
            query=request.query,
            severity=[s.value for s in request.severity] if request.severity else None,
            cvss_score_min=request.cvss_score_min,
            epss_score_min=request.epss_score_min,
            cve_year=request.cve_year,
            cpe=request.cpe,
            assigner=request.assigner,
            is_kev=request.is_kev,
            is_poc=request.is_poc,
            is_template=request.is_template,
            is_remote=request.is_remote,
            limit=request.limit or 1000,  # Higher limit for export
            sort_by=request.sort_by
        )
        
        cves = result.get('cves', [])
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            'cve_id', 'severity', 'cvss_score', 'cvss_vector',
            'description', 'published_at', 'modified_at',
            'is_kev', 'is_poc', 'is_template', 'is_remote',
            'affected_products', 'references'
        ])
        
        writer.writeheader()
        
        for cve in cves:
            # Safely flatten complex fields
            def safe_flatten(value):
                """Convert complex types to CSV-safe strings."""
                if value is None:
                    return ''
                if isinstance(value, (list, tuple)):
                    # Convert list items to strings and join
                    str_items = [str(item) if not isinstance(item, dict) else json.dumps(item) for item in value]
                    return '; '.join(str_items)
                if isinstance(value, dict):
                    return json.dumps(value)
                return str(value)
            
            affected = safe_flatten(cve.get('affected_products', []))
            refs = safe_flatten(cve.get('references', []))
            
            writer.writerow({
                'cve_id': cve.get('cve_id', ''),
                'severity': cve.get('severity', ''),
                'cvss_score': cve.get('cvss_score', ''),
                'cvss_vector': cve.get('cvss_vector', ''),
                'description': cve.get('description', ''),
                'published_at': cve.get('published_at', ''),
                'modified_at': cve.get('modified_at', ''),
                'is_kev': cve.get('is_kev', False),
                'is_poc': cve.get('is_poc', False),
                'is_template': cve.get('is_template', False),
                'is_remote': cve.get('is_remote', False),
                'affected_products': affected,
                'references': refs
            })
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"cve_export_{timestamp}.csv"
        
        # Return as downloadable file
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except Exception as e:
        logger.error(f"CSV export failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {str(e)}"
        )


@router.post("/export/json")
async def export_cves_json(request: VulnxSearchRequest):
    """
    Export CVE search results as JSON file.
    
    Uses the same filters as the search endpoint but returns a downloadable JSON.
    
    Returns:
        JSON file download
    """
    try:
        logger.info(f"JSON export request: {request.query or 'all'}")
        
        # Execute search with higher limit for export
        result = await vulnx_wrapper.search(
            query=request.query,
            severity=[s.value for s in request.severity] if request.severity else None,
            cvss_score_min=request.cvss_score_min,
            epss_score_min=request.epss_score_min,
            cve_year=request.cve_year,
            cpe=request.cpe,
            assigner=request.assigner,
            is_kev=request.is_kev,
            is_poc=request.is_poc,
            is_template=request.is_template,
            is_remote=request.is_remote,
            limit=request.limit or 1000,  # Higher limit for export
            sort_by=request.sort_by
        )
        
        cves = result.get('cves', [])
        
        # Create export data structure
        export_data = {
            "export_date": datetime.now().isoformat(),
            "total_results": result.get('total', 0),
            "exported_count": len(cves),
            "query": request.query,
            "filters": {
                k: v for k, v in request.dict().items()
                if v is not None and k not in ['limit', 'sort_by']
            },
            "cves": cves
        }
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"cve_export_{timestamp}.json"
        
        # Return as downloadable file
        json_str = json.dumps(export_data, indent=2)
        
        return StreamingResponse(
            iter([json_str]),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except Exception as e:
        logger.error(f"JSON export failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {str(e)}"
        )
