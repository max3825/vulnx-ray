"""
Nuclei Scanner API endpoints with real-time streaming.
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import List
import logging
import json
import uuid
from datetime import datetime

from schemas.nuclei import (
    NucleiScanRequest,
    NucleiScanResponse,
    NucleiScanStatus,
    SeverityLevel
)
from services.nuclei_driver import NucleiWrapper, NucleiNotFoundError, NucleiExecutionError

logger = logging.getLogger(__name__)

router = APIRouter()

# Global wrapper instance
nuclei_wrapper = NucleiWrapper()


@router.post("/scan", response_model=NucleiScanResponse, status_code=202)
async def start_scan(request: NucleiScanRequest):
    """
    Start a Nuclei vulnerability scan (async, returns immediately).
    
    The scan runs in the background. Use WebSocket endpoint to stream logs.
    
    **Security Warning**: Only scan systems you own or have authorization to test!
    
    Args:
        request: Scan configuration
    
    Returns:
        NucleiScanResponse with scan_id for tracking
    
    Raises:
        HTTPException: If nuclei is not found or parameters are invalid
    """
    try:
        # Check if nuclei is installed
        if not nuclei_wrapper.check_nuclei_installed():
            raise HTTPException(
                status_code=503,
                detail="Nuclei command not found. Please install nuclei on the server."
            )
        
        # Generate scan ID
        scan_id = f"scan_{uuid.uuid4().hex[:12]}"
        
        # Build command
        severity_list = [s.value for s in request.severity] if request.severity else None
        command, output_folder = nuclei_wrapper.build_command(
            target_url=str(request.target_url),
            severity=severity_list,
            tags=request.tags,
            scan_id=scan_id
        )
        
        return NucleiScanResponse(
            scan_id=scan_id,
            status="pending",
            command=" ".join(command),
            output_folder=output_folder,
            started_at=datetime.utcnow()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start scan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/scan/{scan_id}/ws")
async def websocket_scan_logs(websocket: WebSocket, scan_id: str):
    """
    WebSocket endpoint for real-time scan log streaming.
    
    Client sends initial configuration, then receives log lines.
    
    Args:
        websocket: WebSocket connection
        scan_id: Scan identifier
    """
    await websocket.accept()
    
    try:
        # Receive scan configuration from client
        config_data = await websocket.receive_json()
        request = NucleiScanRequest(**config_data)
        
        # Send acknowledgment
        await websocket.send_json({
            "type": "started",
            "scan_id": scan_id,
            "status": "running"
        })
        
        # Stream logs
        line_number = 0
        severity_list = [s.value for s in request.severity] if request.severity else None
        
        async for line in nuclei_wrapper.execute_with_streaming(
            target_url=str(request.target_url),
            severity=severity_list,
            tags=request.tags,
            scan_id=scan_id
        ):
            line_number += 1
            await websocket.send_json({
                "type": "log",
                "line": line,
                "line_number": line_number
            })
        
        # Send completion
        await websocket.send_json({
            "type": "completed",
            "scan_id": scan_id
        })
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for scan {scan_id}")
        # Kill the scan if client disconnects
        nuclei_wrapper.kill_scan(scan_id)
    except NucleiExecutionError as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": "Internal server error"
        })
    finally:
        await websocket.close()


@router.get("/scans/active", response_model=List[str])
async def get_active_scans():
    """
    Get list of currently running scans.
    
    Returns:
        List of active scan IDs
    """
    return nuclei_wrapper.get_active_scans()


@router.post("/scan/{scan_id}/stop")
async def stop_scan(scan_id: str):
    """
    Stop a running scan.
    
    Args:
        scan_id: Scan identifier
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If scan is not found or already stopped
    """
    if nuclei_wrapper.kill_scan(scan_id):
        return {"message": f"Scan {scan_id} stopped successfully"}
    else:
        raise HTTPException(
            status_code=404,
            detail=f"Scan {scan_id} not found or already stopped"
        )


@router.get("/scan/{scan_id}/status", response_model=NucleiScanStatus)
async def get_scan_status(scan_id: str):
    """
    Get status of a scan.
    
    Args:
        scan_id: Scan identifier
    
    Returns:
        NucleiScanStatus with current status
    """
    active_scans = nuclei_wrapper.get_active_scans()
    is_active = scan_id in active_scans
    
    results = nuclei_wrapper.get_scan_results(scan_id)
    
    if is_active:
        status = "running"
    elif results:
        status = "completed"
    else:
        status = "not_found"
    
    return NucleiScanStatus(
        scan_id=scan_id,
        status=status,
        is_active=is_active,
        output_folder=results.get("output_folder") if results else None,
        findings=results.get("findings") if results else None
    )
