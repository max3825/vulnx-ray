
import sys
import os
import pytest
from unittest.mock import patch, AsyncMock

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_get_search_stats():
    # Mock the wrapper methods
    # We mock get_dashboard_stats directly because that's what the endpoint calls
    # And since we are testing the API endpoint, we don't necessarily need to test the wrapper's internal logic here
    # (Unit testing the wrapper would be a separate test)
    
    mock_stats = {
        "total_cves": 100,
        "kev_count": 10,
        "poc_count": 20,
        "remote_count": 5,
        "severity_distribution": {
            "critical": 15, "high": 20, "medium": 30, "low": 25, "info": 10
        },
        "yearly_trends": [
            {"year": 2020, "count": 10},
            {"year": 2021, "count": 15},
            {"year": 2022, "count": 20},
            {"year": 2023, "count": 25},
            {"year": 2024, "count": 30}
        ]
    }

    with patch('services.vulnx_search_wrapper.vulnx_wrapper.get_dashboard_stats', new_callable=AsyncMock) as mock_get_stats:
        mock_get_stats.return_value = mock_stats

        response = client.get("/api/v1/search/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_cves" in data
        assert "severity_distribution" in data
        assert "yearly_trends" in data
        assert "kev_count" in data
        
        assert data["total_cves"] == 100
        assert data["kev_count"] == 10
        assert data["severity_distribution"]["critical"] == 15
        assert len(data["yearly_trends"]) == 5
