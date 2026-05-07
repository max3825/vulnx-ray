"""
Nuclei Scanner Service
Wrapper for ProjectDiscovery Nuclei CLI to execute vulnerability scans.
"""

import asyncio
import json
import logging
import uuid
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

class NucleiScanner:
    def __init__(self):
        self.nuclei_path = self._find_nuclei_binary()
        self.output_dir = Path(__file__).parent.parent / "nuclei_outputs"
        self.output_dir.mkdir(exist_ok=True)
        
        # In-memory tracking for active scans (for this basic implementation)
        self.active_scans = {}
        
        if self.nuclei_path:
            logger.info(f"Nuclei found at: {self.nuclei_path}")
        else:
            logger.warning("Nuclei binary not found. Scans will fail.")

    def _find_nuclei_binary(self) -> str:
        """Find nuclei binary in system."""
        import subprocess
        try:
            result = subprocess.run(
                ['which', 'nuclei'] if subprocess.os.name != 'nt' else ['where', 'nuclei'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                path = result.stdout.strip().split('\n')[0].strip()
                if path:
                    return path
        except Exception:
            pass
        
        paths = [
            Path.home() / 'go' / 'bin' / 'nuclei',
            Path.home() / 'go' / 'bin' / 'nuclei.exe',
            Path('/usr/local/bin/nuclei'),
            Path(r'C:\Program Files\nuclei\nuclei.exe')
        ]
        
        for p in paths:
            if p.exists():
                return str(p)
        return 'nuclei'

    async def start_scan(self, target: str, templates: Optional[List[str]] = None, cves: Optional[List[str]] = None) -> str:
        """
        Start an asynchronous Nuclei scan against a target.
        Returns the scan ID.
        """
        scan_id = str(uuid.uuid4())
        output_file = self.output_dir / f"{scan_id}.json"
        
        command = [
            self.nuclei_path,
            "-target", target,
            "-json-export", str(output_file),
            "-silent"
        ]
        
        if templates:
            command.extend(["-t", ",".join(templates)])
        
        if cves:
            # Nuclei can filter by tags, which usually includes CVE IDs like 'cve2021-44228'
            tags = ",".join([cve.lower().replace("-", "") for cve in cves])
            command.extend(["-tags", tags])
            
        # Start process
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Initialize DB record
        from database import SessionLocal
        from models.scan import ScanHistory
        
        db = SessionLocal()
        try:
            db_scan = ScanHistory(
                id=scan_id,
                target=target,
                status="running",
                config={"templates": templates, "cves": cves}
            )
            db.add(db_scan)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to create scan record: {e}")
        finally:
            db.close()
            
        # Run monitor in background
        asyncio.create_task(self._monitor_scan(scan_id, process, str(output_file)))
        
        return scan_id

    async def _monitor_scan(self, scan_id: str, process: asyncio.subprocess.Process, output_file_path: str):
        """Wait for scan to finish and update status in DB."""
        try:
            stdout, stderr = await process.communicate()
            
            from database import SessionLocal
            from models.scan import ScanHistory, ScanFinding
            db = SessionLocal()
            
            try:
                db_scan = db.query(ScanHistory).filter(ScanHistory.id == scan_id).first()
                if db_scan:
                    db_scan.status = "completed" if process.returncode == 0 else "failed"
                    db_scan.error = stderr.decode() if process.returncode != 0 else None
                    db_scan.completed_at = datetime.utcnow()
                    
                    # Parse findings
                    output_file = Path(output_file_path)
                    if output_file.exists():
                        with open(output_file, 'r') as f:
                            content = f.read().strip()
                            if content:
                                try:
                                    parsed = json.loads(content)
                                    findings_list = parsed if isinstance(parsed, list) else [parsed]
                                    
                                    for f_data in findings_list:
                                        info = f_data.get("info", {})
                                        db_finding = ScanFinding(
                                            scan_id=scan_id,
                                            template_id=f_data.get("template-id", "unknown"),
                                            name=info.get("name", "Unknown Vulnerability"),
                                            severity=info.get("severity", "info"),
                                            matched_at=f_data.get("matched-at", ""),
                                            raw_data=f_data
                                        )
                                        db.add(db_finding)
                                except Exception as e:
                                    logger.error(f"Error parsing Nuclei JSON output for scan {scan_id}: {e}")
                    
                    db.commit()
                    logger.info(f"Scan {scan_id} finished with code {process.returncode}")
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error monitoring scan {scan_id}: {e}")
            from database import SessionLocal
            from models.scan import ScanHistory
            db = SessionLocal()
            try:
                db_scan = db.query(ScanHistory).filter(ScanHistory.id == scan_id).first()
                if db_scan:
                    db_scan.status = "error"
                    db_scan.error = str(e)
                    db_scan.completed_at = datetime.utcnow()
                    db.commit()
            finally:
                db.close()

    def get_scan_status(self, scan_id: str) -> Dict[str, Any]:
        """Get the current status and results of a scan from DB."""
        from database import SessionLocal
        from models.scan import ScanHistory
        
        db = SessionLocal()
        try:
            db_scan = db.query(ScanHistory).filter(ScanHistory.id == scan_id).first()
            if not db_scan:
                return {"status": "not_found"}
                
            result = {
                "scan_id": db_scan.id,
                "target": db_scan.target,
                "status": db_scan.status,
                "started_at": db_scan.started_at.isoformat() if db_scan.started_at else None,
                "completed_at": db_scan.completed_at.isoformat() if db_scan.completed_at else None,
                "error": db_scan.error
            }
            
            if db_scan.status in ["completed", "failed", "error"]:
                findings = []
                for f in db_scan.findings:
                    findings.append(f.raw_data)
                result["findings"] = findings
                result["findings_count"] = len(findings)
                    
            return result
        finally:
            db.close()

nuclei_scanner = NucleiScanner()
