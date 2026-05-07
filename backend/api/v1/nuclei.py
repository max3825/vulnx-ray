"""
Enhanced Nuclei API — scan management, PDF export, real-time SSE progress, delete
"""

import asyncio
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import List, Optional
from services.nuclei_scanner import nuclei_scanner

router = APIRouter()


class NucleiScanRequest(BaseModel):
    target: str
    templates: Optional[List[str]] = None
    cves: Optional[List[str]] = None


# ─── Start scan ──────────────────────────────────────────────────────────────
@router.post("/scan", summary="Start a Nuclei Scan")
async def start_nuclei_scan(request: NucleiScanRequest):
    try:
        scan_id = await nuclei_scanner.start_scan(
            target=request.target,
            templates=request.templates,
            cves=request.cves,
        )
        return {"status": "success", "scan_id": scan_id, "message": "Scan started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Scan status ─────────────────────────────────────────────────────────────
@router.get("/scan/{scan_id}", summary="Get Scan Status")
async def get_nuclei_scan_status(scan_id: str):
    result = nuclei_scanner.get_scan_status(scan_id)
    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Scan not found")
    return result


# ─── Real-time SSE progress ───────────────────────────────────────────────────
@router.get("/scan/{scan_id}/stream", summary="Stream scan progress via SSE")
async def stream_scan_progress(scan_id: str):
    """Server-Sent Events stream — polls DB every 2 s and pushes updates."""
    async def event_generator():
        for _ in range(180):          # max 6 min
            result = nuclei_scanner.get_scan_status(scan_id)
            data = json.dumps(result)
            yield f"data: {data}\n\n"
            if result.get("status") in ("completed", "failed", "error"):
                break
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── List all scans ───────────────────────────────────────────────────────────
@router.get("/scans", summary="List All Scans")
async def list_scans(limit: int = 100, target: Optional[str] = None):
    from database import SessionLocal
    from models.scan import ScanHistory
    db = SessionLocal()
    try:
        q = db.query(ScanHistory).order_by(ScanHistory.started_at.desc())
        if target:
            q = q.filter(ScanHistory.target.ilike(f"%{target}%"))
        scans = q.limit(limit).all()
        return [
            {
                "scan_id": s.id,
                "target": s.target,
                "status": s.status,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                "findings_count": len(s.findings),
            }
            for s in scans
        ]
    finally:
        db.close()


# ─── Delete a scan ────────────────────────────────────────────────────────────
@router.delete("/scan/{scan_id}", summary="Delete a scan and its findings")
async def delete_scan(scan_id: str):
    from database import SessionLocal
    from models.scan import ScanHistory
    db = SessionLocal()
    try:
        scan = db.query(ScanHistory).filter(ScanHistory.id == scan_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        db.delete(scan)
        db.commit()
        return {"status": "deleted", "scan_id": scan_id}
    finally:
        db.close()


# ─── Export PDF ───────────────────────────────────────────────────────────────
@router.get("/scan/{scan_id}/pdf", summary="Export scan report as PDF")
async def export_scan_pdf(scan_id: str):
    from database import SessionLocal
    from models.scan import ScanHistory
    from services.pdf_export import generate_scan_pdf
    db = SessionLocal()
    try:
        scan = db.query(ScanHistory).filter(ScanHistory.id == scan_id).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        findings = [f.raw_data for f in scan.findings]
        scan_dict = {
            "scan_id": scan.id,
            "target": scan.target,
            "status": scan.status,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        }
        pdf_bytes = generate_scan_pdf(scan_dict, findings)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="vulnxray_scan_{scan_id[:8]}.pdf"'
            },
        )
    finally:
        db.close()


# ─── Real dashboard stats ─────────────────────────────────────────────────────
@router.get("/stats", summary="Scanner statistics from DB")
async def scanner_stats():
    from database import SessionLocal
    from models.scan import ScanHistory, ScanFinding
    from sqlalchemy import func
    db = SessionLocal()
    try:
        total_scans  = db.query(func.count(ScanHistory.id)).scalar() or 0
        total_findings = db.query(func.count(ScanFinding.id)).scalar() or 0
        sev_counts   = dict(
            db.query(ScanFinding.severity, func.count(ScanFinding.id))
              .group_by(ScanFinding.severity).all()
        )
        recent_scans = (
            db.query(ScanHistory)
              .order_by(ScanHistory.started_at.desc())
              .limit(5).all()
        )
        return {
            "total_scans": total_scans,
            "total_findings": total_findings,
            "by_severity": sev_counts,
            "recent_scans": [
                {
                    "scan_id": s.id,
                    "target": s.target,
                    "status": s.status,
                    "findings_count": len(s.findings),
                    "started_at": s.started_at.isoformat() if s.started_at else None,
                }
                for s in recent_scans
            ],
        }
    finally:
        db.close()
