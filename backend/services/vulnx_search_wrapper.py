"""
VulnX Search Wrapper - ProjectDiscovery vulnx CLI
Refactored for AsyncIO and Parallel Execution
"""

import asyncio
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from functools import partial

# Import async-lru for caching
try:
    from async_lru import alru_cache
except ImportError:
    # Fallback if dependency missing (though we added it)
    def alru_cache(maxsize=128):
        def decorator(func):
            return func
        return decorator

logger = logging.getLogger(__name__)


class VulnxSearchWrapper:
    """Async Wrapper for ProjectDiscovery vulnx CLI tool."""
    
    def __init__(self):
        """Initialize vulnx wrapper."""
        # This is synchronous, which is fine for init
        try:
            self.vulnx_path = self._find_vulnx_binary()
            logger.info(f"Vulnx found at: {self.vulnx_path}")
        except Exception as e:
            logger.warning(f"Vulnx binary not found: {e}")
            self.vulnx_path = None
    
    def _find_vulnx_binary(self) -> str:
        """Find vulnx binary in system (sync helper)."""
        import subprocess
        # Check if vulnx is in PATH
        try:
            result = subprocess.run(
                ['which', 'vulnx'] if subprocess.os.name != 'nt' else ['where', 'vulnx'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                # 'where' on windows can return multiple lines
                path = result.stdout.strip().split('\n')[0].strip()
                if path:
                    return path
                return 'vulnx'
        except Exception:
            pass
        
        # Check standard locations
        paths = [
            Path.home() / 'go' / 'bin' / 'vulnx',
            Path.home() / 'go' / 'bin' / 'vulnx.exe',
            Path('/usr/local/bin/vulnx'),
            Path(r'C:\Program Files\vulnx\vulnx.exe')
        ]
        
        for p in paths:
            if p.exists():
                return str(p)
        
        # Fallback to just command name and hope it's in PATH
        return 'vulnx'

    async def _run_command(self, args: List[str], timeout: int = 60) -> Dict[str, Any]:
        """
        Internal async helper to run subprocess commands.
        """
        if not self.vulnx_path:
             return {"error": "vulnx binary not found", "returncode": -1}

        cmd_str = " ".join(args)
        # logger.debug(f"Async exec: {cmd_str}")

        try:
            process = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
                return {
                    "stdout": stdout.decode() if stdout else "",
                    "stderr": stderr.decode() if stderr else "",
                    "returncode": process.returncode
                }
            except asyncio.TimeoutError:
                # Kill process on timeout
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
                raise
                
        except asyncio.TimeoutError:
            logger.error(f"Timeout executing: {cmd_str}")
            return {"error": "Timeout", "returncode": -1}
        except Exception as e:
            logger.error(f"Error executing {cmd_str}: {e}")
            return {"error": str(e), "returncode": -1}

    async def search(
        self,
        query: Optional[str] = None,
        severity: Optional[List[str]] = None,
        cvss_score_min: Optional[float] = None,
        epss_score_min: Optional[float] = None,
        cve_year: Optional[int] = None,
        cpe: Optional[str] = None,
        assigner: Optional[str] = None,
        is_kev: Optional[bool] = None,
        is_poc: Optional[bool] = None,
        is_template: Optional[bool] = None,
        is_remote: Optional[bool] = None,
        limit: int = 50,
        sort_by: str = "cvss_score"
    ) -> Dict[str, Any]:
        """
        Execute generic vulnx search with filters (ASYNC).
        """
        # Build query string
        query_parts = []
        
        if query:
            query_parts.append(query)
        
        if severity:
            if len(severity) == 1:
                query_parts.append(f'severity:{severity[0]}')
            else:
                severity_str = ' || '.join([f'severity:{s}' for s in severity])
                query_parts.append(f'({severity_str})')
        
        if cvss_score_min is not None:
            query_parts.append(f'cvss_score:>={cvss_score_min}')
        
        if epss_score_min is not None:
            query_parts.append(f'epss_score:>={epss_score_min}')

        if cpe:
            query_parts.append(f'cpe_affected:{cpe}')
            
        if assigner:
            query_parts.append(f'assigner:{assigner}')
        
        if cve_year is not None:
            query_parts.append(
                f'cve_created_at:>={cve_year}-01-01 && cve_created_at:<{cve_year + 1}-01-01'
            )
        
        if is_kev is not None:
            query_parts.append(f'is_kev:{str(is_kev).lower()}')
        
        if is_poc is not None:
            query_parts.append(f'is_poc:{str(is_poc).lower()}')
        
        if is_template is not None:
            query_parts.append(f'is_template:{str(is_template).lower()}')
        
        if is_remote is not None:
            query_parts.append(f'is_remote:{str(is_remote).lower()}')
        
        # Join with AND
        full_query = ' && '.join(query_parts) if query_parts else '*'
        
        # logger.info(f"Executing async vulnx search: {full_query}")
        
        # Build command
        command = [
            self.vulnx_path,
            'search',
            full_query,
            '--json',
            '--silent',
            '--limit', str(limit),
            '--sort-desc', sort_by
        ]
        
        result = await self._run_command(command, timeout=60)
        
        if result.get("returncode") != 0:
            logger.error(f"vulnx search failed: {result.get('stderr')}")
            return {
                "cves": [],
                "total": 0,
                "query_string": full_query,
                "error": result.get("stderr") or result.get("error")
            }
        
        # Parse JSON output
        try:
            stdout = result.get("stdout", "").strip()
            
            # Find the first '{' which marks the start of JSON
            json_start = stdout.find('{')
            if json_start == -1:
                if not stdout:
                     return {
                        "cves": [],
                        "total": 0,
                        "query_string": full_query
                    }
                return {
                    "cves": [],
                    "total": 0,
                    "query_string": full_query,
                    "error": "No JSON in vulnx output"
                }
            
            json_str = stdout[json_start:]
            data = json.loads(json_str)
            
            cves = data.get('cves', data.get('results', []))
            
            # Normalize cve_id from id if missing
            valid_cves = []
            for cve in cves:
                if 'cve_id' not in cve and 'id' in cve:
                    cve['cve_id'] = cve['id']
                
                if 'cve_id' in cve:
                    valid_cves.append(cve)
            
            cves = valid_cves
            total = data.get('total', data.get('count', 0))
            
            return {
                "cves": cves,
                "total": total,
                "query_string": full_query
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse vulnx output: {e}\nOutput: {stdout[:200]}...")
            return {
                "cves": [],
                "total": 0,
                "query_string": full_query,
                "error": f"Invalid JSON response: {str(e)}"
            }

    @alru_cache(maxsize=100)
    async def get_cve_details(self, cve_id: str) -> Dict[str, Any]:
        """Get detailed CVE information (Cached)."""
        logger.info(f"Getting details for {cve_id}")
        
        command = [self.vulnx_path, 'id', cve_id, '--json', '--silent']
        
        result = await self._run_command(command, timeout=30)
        
        if result.get("returncode") != 0:
            raise Exception(f"vulnx id failed: {result.get('stderr')}")
        
        stdout = result.get("stdout", "").strip()
        json_start = stdout.find('{')
        if json_start == -1:
             raise Exception(f"No JSON found in vulnx output")

        json_str = stdout[json_start:]
        data = json.loads(json_str)
        
        # Normalize fields
        if data.get('cvss_metrics') and isinstance(data['cvss_metrics'], str):
            try:
                data['cvss_metrics'] = json.loads(data['cvss_metrics'])
            except:
                data['cvss_metrics'] = {}
        
        if data.get('cwe_ids') is None:
            data['cwe_ids'] = []
            
        if data.get('affected_products') is None:
            data['affected_products'] = []
            
        if data.get('references') is None:
            data['references'] = []

        return data

    @alru_cache(maxsize=1)
    async def list_filters(self) -> List[Dict[str, Any]]:
        """List all available filters."""
        command = [self.vulnx_path, 'filters', '--json']
        result = await self._run_command(command, timeout=30)
        
        if result.get("returncode") != 0:
            raise Exception(f"vulnx filters failed: {result.get('stderr')}")
            
        return json.loads(result.get("stdout"))

    async def healthcheck(self) -> Dict[str, Any]:
        """Check vulnx health."""
        command = [self.vulnx_path, 'version']
        result = await self._run_command(command, timeout=10)
        
        if result.get("returncode") == 0:
            version = "unknown"
            for line in result.get("stdout", "").splitlines():
                if "version" in line.lower():
                    version = line.split()[-1] if line.split() else "unknown"
                    break
            
            return {
                "healthy": True,
                "version": version,
                "output": result.get("stdout")
            }
        else:
            return {"healthy": False, "error": result.get("stderr")}

    @alru_cache(maxsize=1, ttl=300) # Cache for 5 minutes
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """
        Get aggregated dashboard statistics in PARALLEL.
        """
        logger.info("Collecting dashboard stats (Parallel)...")
        
        stats = {
            "total_cves": 0,
            "severity_distribution": {
                "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0
            },
            "yearly_trends": [],
            "kev_count": 0,
            "poc_count": 0,
            "remote_count": 0
        }

        # Helper to get count for a specific filter
        async def get_count(**kwargs):
            try:
                # Use limit=1 to be faster, we only need total
                res = await self.search(limit=1, **kwargs)
                return res.get('total', 0)
            except Exception as e:
                logger.error(f"Failed to get stats for {kwargs}: {e}")
                return 0

        # Create tasks for all queries
        tasks = []
        
        # 1. Key Metrics
        tasks.append(("kev", get_count(is_kev=True)))
        tasks.append(("poc", get_count(is_poc=True)))
        tasks.append(("remote", get_count(is_remote=True)))
        
        # 2. Severity Distribution
        severities = ["critical", "high", "medium", "low", "info"]
        for sev in severities:
             tasks.append((f"sev_{sev}", get_count(severity=[sev])))

        # 3. Yearly Trends (Last 5 years)
        import datetime
        current_year = datetime.datetime.now().year
        start_year = current_year - 15
        years = range(start_year, current_year + 1)
        for year in years:
             tasks.append((f"year_{year}", get_count(cve_year=year)))

        # Execute all tasks concurrently
        logger.info(f"Firing {len(tasks)} parallel search queries...")
        start_time = datetime.datetime.now()
        
        results = await asyncio.gather(*[t[1] for t in tasks])
        
        duration = (datetime.datetime.now() - start_time).total_seconds()
        logger.info(f"Dashboard stats collected in {duration:.2f}s")

        # Map results back to stats
        result_map = {tasks[i][0]: results[i] for i in range(len(tasks))}
        
        stats["kev_count"] = result_map["kev"]
        stats["poc_count"] = result_map["poc"]
        stats["remote_count"] = result_map["remote"]
        
        total_cves = 0
        for sev in severities:
            count = result_map[f"sev_{sev}"]
            stats["severity_distribution"][sev] = count
            total_cves += count
        stats["total_cves"] = total_cves
        
        for year in years:
            stats["yearly_trends"].append({
                "year": year,
                "count": result_map[f"year_{year}"]
            })
            
        return stats


# Global instance
vulnx_wrapper = VulnxSearchWrapper()
