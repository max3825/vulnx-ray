
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_search_history_lifecycle():
    # 1. Clear history
    response = client.delete("/api/v1/searches/history")
    assert response.status_code == 204

    # 2. Log a search
    payload = {
        "query": "wordpress",
        "filters": {"severity": ["critical"]},
        "results_count": 10,
        "execution_time_ms": 150
    }
    response = client.post("/api/v1/searches/history", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["query"] == "wordpress"
    history_id = data["id"]

    # 3. Get history
    response = client.get("/api/v1/searches/history")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["items"][0]["id"] == history_id

    # 4. Delete specific history
    response = client.delete(f"/api/v1/searches/history/{history_id}")
    assert response.status_code == 204

    # 5. Verify deletion
    response = client.get("/api/v1/searches/history")
    assert response.status_code == 200
    data = response.json()
    # Should be empty provided no other tests ran in parallel
    current_ids = [item["id"] for item in data["items"]]
    assert history_id not in current_ids

def test_saved_search_lifecycle():
    # 1. Save a search
    payload = {
        "name": "Integration Test Search",
        "description": "Created by automated test",
        "query": "apache struts",
        "filters": {"severity": ["high", "critical"]}
    }
    response = client.post("/api/v1/searches/saved", json=payload)
    if response.status_code == 400:
        # Might already exist from previous run
        # Try to find and delete it first? Or just ignore for now if name collision
        # But let's assume clean state or unique name?
        # Let's generate unique name
        import time
        payload["name"] = f"Integration Test Search {time.time()}"
        response = client.post("/api/v1/searches/saved", json=payload)

    assert response.status_code == 201
    data = response.json()
    search_id = data["id"]
    assert data["name"] == payload["name"]

    # 2. List saved searches
    response = client.get("/api/v1/searches/saved")
    assert response.status_code == 200
    data = response.json()
    ids = [item["id"] for item in data["items"]]
    assert search_id in ids

    # 3. Get specific saved search
    response = client.get(f"/api/v1/searches/saved/{search_id}")
    assert response.status_code == 200
    assert response.json()["id"] == search_id

    # 4. Execute saved search (updates usage)
    response = client.post(f"/api/v1/searches/saved/{search_id}/execute")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 5. Toggle favorite
    response = client.put(f"/api/v1/searches/saved/{search_id}", json={"is_favorite": True})
    assert response.status_code == 200
    assert response.json()["is_favorite"] == True

    # 6. Delete saved search
    response = client.delete(f"/api/v1/searches/saved/{search_id}")
    assert response.status_code == 204

    # 7. Verify deletion
    response = client.get(f"/api/v1/searches/saved/{search_id}")
    assert response.status_code == 404
