from fastapi.testclient import TestClient


def test_health_check_endpoint(client: TestClient):
    """Test that GET /health returns status 200 and status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == "PassPass API"
    assert data["database"] == "connected"


def test_api_v1_health_check_endpoint(client: TestClient):
    """Test that GET /api/v1/health returns status 200 and status ok."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_root_endpoint(client: TestClient):
    """Test that GET / returns welcome information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["health"] == "/health"
