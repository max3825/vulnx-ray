"""
Nuclei Scanner Wrapper Service
Executes the Nuclei vulnerability scanner and streams output in real-time.
"""

import subprocess
import asyncio
import logging
import uuid
import os
import json
from typing import Optional, AsyncGenerator, Dict, Any, List
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class NucleiExecutionError(Exception):
    """Raised when Nuclei execution fails."""
    pass


class NucleiNotFoundError(Exception):
    """Raised when Nuclei command is not found on the system."""
    pass


class NucleiWrapper:
    """
    Wrapper for the Nuclei vulnerability scanner with real-time output streaming.
    
    This class handles:
    - Dynamic command construction
    - Subprocess execution with async streaming
    - Real-time stdout/stderr streaming
    - Error handling and process management
    """
    
    def __init__(self, nuclei_path: str = "/root/go/bin/nuclei", output_base_dir: str = "./nuclei_outputs"):
        """
        Initialize the Nuclei wrapper.
        
        Args:
            nuclei_path: Path to nuclei executable (default: "nuclei" from PATH)
            output_base_dir: Base directory for storing scan outputs
        """
        self.nuclei_path = nuclei_path
        self.output_base_dir = Path(output_base_dir)
        self.output_base_dir.mkdir(parents=True, exist_ok=True)
        
        # Active processes registry
        self.active_processes: Dict[str, asyncio.subprocess.Process] = {}
    
    async def _async_generator_to_list(self, gen):
        """Helper to consume async generator."""
        result = []
        async for item in gen:
            result.append(item)
        return result
    
    def check_nuclei_installed(self) -> bool:
        """
        Check if nuclei command is available.
        
        Returns:
            bool: True if nuclei is found, False otherwise
        """
        try:
            result = subprocess.run(
                [self.nuclei_path, "-version"],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except (subprocess.SubprocessError, FileNotFoundError):
            return False
    
    def build_command(
        self,
        target_url: str,
        severity: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        scan_id: Optional[str] = None
    ) -> tuple[list[str], str]:
        """
        Build the nuclei command with specified parameters.
        
        Args:
            target_url: Target URL to scan
            severity: Severity levels to filter (critical, high, medium, low, info)
            tags: Template tags to use (e.g., ['cve', 'owasp'])
            scan_id: Unique scan identifier for output folder
        
        Returns:
            tuple: (command_list, output_folder)
        
        Raises:
            ValueError: If target_url is not provided
        """
        if not target_url:
            raise ValueError("target_url must be provided")
        
        # Generate scan ID if not provided
        if not scan_id:
            scan_id = f"scan_{uuid.uuid4().hex[:12]}"
        
        output_folder = str(self.output_base_dir / scan_id)
        os.makedirs(output_folder, exist_ok=True)
        
        # Build command
        command = [
            self.nuclei_path,
            "-u", target_url,
            "-jsonl",  # JSON Lines output for parsing (v3 format)
        ]
        
        # Severity filtering
        if severity:
            command.extend(["-severity", ",".join(severity)])
        
        # Tag filtering (default to CVE if not specified)
        if tags:
            command.extend(["-tags", ",".join(tags)])
        else:
            command.extend(["-tags", "cve"])  # Default to CVE templates
        
        # Output to file
        output_file = os.path.join(output_folder, "results.json")
        command.extend(["-o", output_file])
        
        logger.info(f"Built command: {' '.join(command)}")
        
        return command, output_folder
    
    async def execute_with_streaming(
        self,
        target_url: str,
        severity: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        scan_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Execute Nuclei and stream output line by line in real-time.
        
        This is an async generator that yields log lines as they are produced.
        
        Args:
            target_url: Target URL to scan
            severity: Severity levels to filter
            tags: Template tags to use
            scan_id: Scan identifier
        
        Yields:
            str: Log lines from nuclei output
        
        Raises:
            NucleiNotFoundError: If nuclei command is not found
            NucleiExecutionError: If execution fails
        """
        # Check if nuclei is installed
        if not self.check_nuclei_installed():
            raise NucleiNotFoundError(
                f"Nuclei command '{self.nuclei_path}' not found. "
                "Please install nuclei or specify correct path."
            )
        
        # Build command
        if not scan_id:
            scan_id = f"scan_{uuid.uuid4().hex[:12]}"
        
        command, output_folder = self.build_command(
            target_url=target_url,
            severity=severity,
            tags=tags,
            scan_id=scan_id
        )
        
        # Start process
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Register active process
            self.active_processes[scan_id] = process
            
            yield f"[INFO] 🔍 Starting Nuclei scan {scan_id}\n"
            yield f"[INFO] 🎯 Target: {target_url}\n"
            yield f"[INFO] 📁 Output: {output_folder}\n"
            yield "=" * 80 + "\n"
            
            output_file = os.path.join(output_folder, "results.json")
            seen_lines = 0
            vulnerabilities_found = 0
            
            # Tail the output file in real-time while process runs
            async def tail_output_file():
                nonlocal seen_lines, vulnerabilities_found
                while process.returncode is None:
                    try:
                        if os.path.exists(output_file):
                            with open(output_file, 'r') as f:
                                lines = f.readlines()
                                new_lines = lines[seen_lines:]
                                seen_lines = len(lines)
                                
                                for line in new_lines:
                                    try:
                                        data = json.loads(line.strip())
                                        template_id = data.get('template-id', 'unknown')
                                        template_name = data.get('info', {}).get('name', 'Unknown')
                                        matched_at = data.get('matched-at', target_url)
                                        severity_level = data.get('info', {}).get('severity', 'unknown').upper()
                                        cve_ids = data.get('info', {}).get('classification', {}).get('cve-id', [])
                                        
                                        vulnerabilities_found += 1
                                        
                                        # Format nicely
                                        severity_icon = {
                                            'CRITICAL': '🔴',
                                            'HIGH': '🟠',
                                            'MEDIUM': '🟡',
                                            'LOW': '🔵',
                                            'INFO': '⚪'
                                        }.get(severity_level, '⚫')
                                        
                                        yield f"\n{severity_icon} [{severity_level}] {template_name}\n"
                                        yield f"   Template: {template_id}\n"
                                        yield f"   URL: {matched_at}\n"
                                        if cve_ids:
                                            yield f"   CVEs: {', '.join(cve_ids)}\n"
                                    except json.JSONDecodeError:
                                        continue
                    except Exception as e:
                        logger.error(f"Error reading output file: {e}")
                    
                    await asyncio.sleep(0.5)  # Poll every 500ms
            
            # Read stderr for progress messages
            async def read_stderr():
                async for line in process.stderr:
                    decoded = line.decode('utf-8', errors='replace').strip()
                    if decoded and not decoded.startswith('['):
                        # Show Nuclei progress messages
                        yield f"[NUCLEI] {decoded}\n"
            
            # Run both tasks concurrently
            try:
                tail_task = asyncio.create_task(self._async_generator_to_list(tail_output_file()))
                stderr_task = asyncio.create_task(self._async_generator_to_list(read_stderr()))
                
                # Stream stderr first for progress
                async for msg in read_stderr():
                    yield msg
                
                # Wait for process
                await process.wait()
                
                # Final tail to catch any remaining results
                await asyncio.sleep(1)  # Give filesystem time to flush
                async for msg in tail_output_file():
                    yield msg
                    
            except Exception as e:
                yield f"\n[ERROR] Streaming error: {str(e)}\n"
            
            # Cleanup
            self.active_processes.pop(scan_id, None)
            
            # Check exit code
            yield "\n" + "=" * 80 + "\n"
            if process.returncode == 0:
                yield f"[SUCCESS] ✅ Scan completed!\n"
                yield f"[INFO] 📊 Vulnerabilities found: {vulnerabilities_found}\n"
                yield f"[INFO] 💾 Full results: {output_file}\n"
            else:
                stderr = await process.stderr.read()
                error_msg = stderr.decode('utf-8', errors='replace')
                yield f"[ERROR] ❌ Scan failed with exit code {process.returncode}\n"
                if error_msg:
                    yield f"[ERROR] {error_msg}\n"
                raise NucleiExecutionError(f"Nuclei exited with code {process.returncode}")
        
        except FileNotFoundError:
            raise NucleiNotFoundError(f"Command not found: {self.nuclei_path}")
        
        except Exception as e:
            # Cleanup on error
            if scan_id in self.active_processes:
                self.kill_scan(scan_id)
            
            yield f"\n[ERROR] Execution failed: {str(e)}\n"
            raise NucleiExecutionError(f"Failed to execute nuclei: {str(e)}")
    
    def kill_scan(self, scan_id: str) -> bool:
        """
        Kill a running scan by its ID.
        
        Args:
            scan_id: Scan identifier
        
        Returns:
            bool: True if process was killed, False if not found
        """
        process = self.active_processes.get(scan_id)
        if process:
            try:
                process.kill()
                self.active_processes.pop(scan_id, None)
                logger.info(f"Killed scan {scan_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to kill scan {scan_id}: {e}")
                return False
        return False
    
    def get_active_scans(self) -> list[str]:
        """
        Get list of currently running scan IDs.
        
        Returns:
            list: Active scan IDs
        """
        # Clean up completed processes
        completed = []
        for scan_id, process in self.active_processes.items():
            if process.returncode is not None:
                completed.append(scan_id)
        
        for scan_id in completed:
            self.active_processes.pop(scan_id, None)
        
        return list(self.active_processes.keys())
    
    def get_scan_results(self, scan_id: str) -> Optional[Dict[str, Any]]:
        """
        Parse results from a completed scan.
        
        Args:
            scan_id: Scan identifier
        
        Returns:
            dict: Parsed results or None if not found
        """
        output_folder = self.output_base_dir / scan_id
        
        if not output_folder.exists():
            return None
        
        results_file = output_folder / "results.json"
        
        results = {
            "scan_id": scan_id,
            "output_folder": str(output_folder),
            "files": [str(f) for f in output_folder.glob("*")],
            "findings": []
        }
        
        # Parse JSON results if available
        if results_file.exists():
            try:
                with open(results_file, 'r') as f:
                    for line in f:
                        try:
                            finding = json.loads(line.strip())
                            results["findings"].append(finding)
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                logger.error(f"Failed to parse results: {e}")
        
        return results
