from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

class AlertRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    filters: Dict[str, Any]
    is_active: bool = True
    emails: List[EmailStr] = []
    webhook_url: Optional[str] = None

class AlertRuleCreate(AlertRuleBase):
    pass

class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    emails: Optional[List[EmailStr]] = None
    webhook_url: Optional[str] = None

class AlertRuleResponse(AlertRuleBase):
    id: int
    created_at: datetime
    last_triggered_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class AlertTestRequest(BaseModel):
    rule_id: int
