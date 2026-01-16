
import logging
import asyncio
import os
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import json

from models.alerts import AlertRule, AlertHistory
from services.vulnx_search_wrapper import vulnx_wrapper

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "1025"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")
        self.from_email = os.getenv("FROM_EMAIL", "alerts@vulnx-ray.local")
        self.mock_mode = not (self.smtp_user and self.smtp_pass)

    async def send_notification(self, rule: AlertRule, new_cves: List[Dict[str, Any]]):
        if not new_cves:
            return

        message = self._format_message(rule, new_cves)

        if rule.emails:
            await self._send_emails(rule.emails, f"VulnX Alert: {rule.name}", message)
        
        if rule.webhook_url:
            await self._send_webhook(rule.webhook_url, rule.name, new_cves)

    async def _send_emails(self, recipients: List[str], subject: str, body: str):
        if self.mock_mode:
            logger.info(f"[MOCK] Sending email to {recipients}: {subject}")
            return

        # Real SMTP implementation would be added here
        logger.info(f"Sending email to {recipients} via {self.smtp_host}:{self.smtp_port}")

    async def _send_webhook(self, url: str, rule_name: str, cves: List[Dict[str, Any]]):
        try:
            payload = {
                "rule": rule_name,
                "timestamp": datetime.utcnow().isoformat(),
                "cve_count": len(cves),
                "cves": cves
            }
            # For this phase, we just log the webhook attempt to avoid external dependencies or errors
            logger.info(f"Webhook payload prepared for {url}: {len(cves)} CVEs")
            # import requests
            # requests.post(url, json=payload, timeout=5)
        except Exception as e:
            logger.error(f"Webhook failed: {e}")

    def _format_message(self, rule: AlertRule, cves: List[Dict[str, Any]]) -> str:
        lines = [f"Alert Rule '{rule.name}' triggered.", f"Found {len(cves)} new CVEs:", ""]
        for cve in cves[:10]:
            lines.append(f"- {cve.get('cve_id')}: {cve.get('title', 'No title')}")
        if len(cves) > 10:
            lines.append(f"... and {len(cves) - 10} more.")
        return "\n".join(lines)


class MonitorService:
    def __init__(self, db_session_factory):
        self.notification_service = NotificationService()
        self.db_session_factory = db_session_factory
        self.running = False
        self._task = None

    async def start(self, interval_seconds: int = 3600):
        if self.running:
            return
            
        self.running = True
        logger.info(f"Starting MonitorService with interval {interval_seconds}s")
        # Use a task to run the loop
        self._task = asyncio.create_task(self._loop(interval_seconds))

    async def _loop(self, interval_seconds):
        while self.running:
            try:
                await self.run_checks()
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")
            
            # Wait for next interval
            await asyncio.sleep(interval_seconds)

    def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()

    async def run_checks(self):
        logger.info("Running scheduled alert checks...")
        # Create a new session for this run
        db = self.db_session_factory()
        try:
            active_rules = db.query(AlertRule).filter(AlertRule.is_active == True).all()
            for rule in active_rules:
                await self._process_rule(db, rule)
        finally:
            db.close()

    async def _process_rule(self, db: Session, rule: AlertRule):
        # 1. Search CVEs based on filters
        filters = rule.filters or {}
        
        # Map filters to vulnx_wrapper.search arguments
        # Only include recognized arguments
        search_params = {}
        if filters.get("query"):
            search_params["query"] = filters.get("query")
        if filters.get("severity"):
            # Ensure it's a list
            sev = filters.get("severity")
            search_params["severity"] = sev if isinstance(sev, list) else [sev]
        if filters.get("cvss_score_min"):
            search_params["cvss_score_min"] = filters.get("cvss_score_min")
        if filters.get("is_kev") is not None:
             search_params["is_kev"] = filters.get("is_kev")
        if filters.get("cve_year"):
             search_params["cve_year"] = filters.get("cve_year")
             
        # Fetch recent 50 results to check against history
        # vulnx doesn't support "created_after_timestamp", so we poll recent items
        results = await vulnx_wrapper.search(limit=50, **search_params) 
        cves = results.get("cves", [])
        
        new_cves = []
        for cve in cves:
            cve_id = cve.get("cve_id")
            if not cve_id:
                continue
                
            # Check history
            exists = db.query(AlertHistory).filter_by(rule_id=rule.id, cve_id=cve_id).first()
            if not exists:
                new_cves.append(cve)
                # Add to history
                history = AlertHistory(rule_id=rule.id, cve_id=cve_id)
                db.add(history)
        
        if new_cves:
            logger.info(f"Rule '{rule.name}' matched {len(new_cves)} new CVEs")
            await self.notification_service.send_notification(rule, new_cves)
            rule.last_triggered_at = datetime.utcnow()
            db.commit()
        else:
            logger.debug(f"Rule '{rule.name}' checked, no new CVEs")

# Global instance place-holder (will be initialized in main)
monitor_service = None
