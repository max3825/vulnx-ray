
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import logging

# Set testing mode environment variable to prevent monitor startup if needed, 
# but main.py has logic to handle it or we mock it.
# Actually, Main.py starts monitor on startup event. 
# TestClient runs startup events by default with Starlette.
# We should probably mock MonitorService start/stop to avoid real background tasks during tests.

from backend.main import app
from backend.database import Base, get_db
from backend.models.alerts import AlertRule
import services.notification_service as notification_service

# Mock MonitorService to prevent background loop
async def mock_start(interval=3600):
    pass
async def mock_stop():
    pass

notification_service.MonitorService.start = mock_start
notification_service.MonitorService.stop = mock_stop


# Setup in-memory DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_create_alert_rule():
    response = client.post(
        "/api/v1/alerts/",
        json={
            "name": "Test Rule",
            "description": "A test rule",
            "filters": {"severity": ["critical"]},
            "emails": ["test@example.com"],
            "webhook_url": "http://localhost/webhook"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Rule"
    assert data["is_active"] == True
    assert "critical" in data["filters"]["severity"]

def test_get_alert_rules():
    # Create one first
    client.post(
        "/api/v1/alerts/",
        json={
            "name": "Rule 1",
            "filters": {"severity": ["high"]}
        }
    )
    
    response = client.get("/api/v1/alerts/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Rule 1"

def test_delete_alert_rule():
    # Create
    create_res = client.post(
        "/api/v1/alerts/",
        json={
            "name": "To Delete",
            "filters": {}
        }
    )
    rule_id = create_res.json()["id"]
    
    # Delete
    del_res = client.delete(f"/api/v1/alerts/{rule_id}")
    assert del_res.status_code == 200
    
    # Verify gone
    get_res = client.get(f"/api/v1/alerts/{rule_id}")
    assert get_res.status_code == 404

def test_trigger_test_alert():
    # Create
    create_res = client.post(
        "/api/v1/alerts/",
        json={
            "name": "Test Trigger",
            "filters": {}
        }
    )
    rule_id = create_res.json()["id"]
    
    # Trigger
    res = client.post(f"/api/v1/alerts/{rule_id}/test")
    assert res.status_code == 200
    assert res.json()["message"] == "Test notification triggered"
