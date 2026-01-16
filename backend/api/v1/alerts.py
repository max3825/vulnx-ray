
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.alerts import AlertRule, AlertHistory
from schemas.alerts import AlertRuleCreate, AlertRuleUpdate, AlertRuleResponse
from services.notification_service import NotificationService

router = APIRouter()

@router.post(
    "/", 
    response_model=AlertRuleResponse,
    summary="Create Alert Rule",
    description="Create a new rule to monitor for specific vulnerabilities (e.g., 'Critical severity in WordPress').",
    response_description="The created alert rule object."
)
def create_alert_rule(rule: AlertRuleCreate, db: Session = Depends(get_db)):
    """Create a new alert rule."""
    db_rule = AlertRule(
        name=rule.name,
        description=rule.description,
        filters=rule.filters,
        is_active=rule.is_active,
        emails=rule.emails,
        webhook_url=rule.webhook_url
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.get(
    "/", 
    response_model=List[AlertRuleResponse],
    summary="List Alert Rules",
    description="Retrieve all configured alert rules with pagination support.",
    response_description="List of alert rules."
)
def get_alert_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all alert rules."""
    return db.query(AlertRule).offset(skip).limit(limit).all()

@router.get(
    "/{rule_id}", 
    response_model=AlertRuleResponse,
    summary="Get Alert Rule",
    description="Get details of a specific alert rule by ID.",
    response_description="Alert rule details."
)
def get_alert_rule(rule_id: int, db: Session = Depends(get_db)):
    """Get a specific alert rule."""
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return rule

@router.put(
    "/{rule_id}", 
    response_model=AlertRuleResponse,
    summary="Update Alert Rule",
    description="Update an existing alert rule. Partial updates are supported (only provided fields will be changed).",
    response_description="The updated alert rule."
)
def update_alert_rule(rule_id: int, rule_update: AlertRuleUpdate, db: Session = Depends(get_db)):
    """Update an alert rule."""
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    
    update_data = rule_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_rule, field, value)
    
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.delete(
    "/{rule_id}",
    summary="Delete Alert Rule",
    description="Permanently delete an alert rule.",
    response_description="Success message."
)
def delete_alert_rule(rule_id: int, db: Session = Depends(get_db)):
    """Delete an alert rule."""
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    
    db.delete(db_rule)
    db.commit()
    return {"message": "Alert rule deleted"}

@router.get(
    "/{rule_id}/history",
    summary="Get Alert History",
    description="Retrieve the notification history for a specific rule (e.g., list of CVEs that triggered this rule).",
    response_description="List of history entries."
)
def get_alert_history(rule_id: int, db: Session = Depends(get_db)):
    """Get history for a specific rule."""
    history = db.query(AlertHistory).filter(AlertHistory.rule_id == rule_id).order_by(AlertHistory.sent_at.desc()).limit(50).all()
    return history

@router.post(
    "/{rule_id}/test",
    summary="Test Alert Rule",
    description="Trigger a dry-run notification for a specific rule to test email/webhook integrations.",
    response_description="Confirmation that the test was triggered."
)
async def test_alert_rule(rule_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Test an alert rule by sending a sample notification.
    """
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    
    # Create a sample CVE payload for testing
    sample_cves = [{
        "cve_id": "TEST-CVE-2024-0001",
        "title": "Test Vulnerability for Alert Validation",
        "description": "This is a test notification to verify your alert configuration.",
        "severity": "info",
        "cvss_score": 0.0,
        "affected_products": ["Test Product"]
    }]
    
    service = NotificationService()
    
    # Run in background to avoid blocking
    background_tasks.add_task(service.send_notification, db_rule, sample_cves)
    
    return {"message": "Test notification triggered"}
