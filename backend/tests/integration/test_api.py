import pytest
from httpx import AsyncClient, ASGITransport
from mission_control.main import app


@pytest.mark.asyncio
class TestHealthEndpoint:
    async def test_health_check(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"


@pytest.mark.asyncio
class TestBriefsAPI:
    async def test_list_briefs_empty(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/briefs")
            assert response.status_code == 200
            assert response.json() == []

    async def test_list_briefs_stats(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/briefs/stats")
            assert response.status_code == 200
            data = response.json()
            assert "total_briefs" in data
            assert "drafts" in data
            assert "in_progress" in data
            assert "review" in data
            assert "done" in data
            assert "blocked" in data

    async def test_list_briefs_focus(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/briefs/focus")
            assert response.status_code == 200
            assert isinstance(response.json(), list)


@pytest.mark.asyncio
class TestSprintsAPI:
    async def test_list_sprints_empty(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/sprints")
            assert response.status_code == 200
            assert response.json() == []

    async def test_create_sprint(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/sprints",
                json={"name": "Sprint 1", "start_date": "2024-01-01"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "Sprint 1"
            assert data["status"] == "active"


@pytest.mark.asyncio
class TestPlanAPI:
    async def test_get_plan_empty(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/plan/Sprint 1")
            assert response.status_code == 200
            data = response.json()
            assert data["sprint"] == "Sprint 1"

    async def test_update_plan(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/plan/Sprint 1",
                json={"items": [{"id": "1", "title": "Task 1"}]},
            )
            assert response.status_code == 200
            data = response.json()
            assert "items" in data

    async def test_generate_daily_summary(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/plan/Sprint 1/daily-summary")
            assert response.status_code == 200
            data = response.json()
            assert "date" in data
            assert "sprint" in data


@pytest.mark.asyncio
class TestReviewAPI:
    async def test_list_reviews_empty(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/review")
            assert response.status_code == 200
            assert response.json() == []

    async def test_create_review(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/review",
                json={
                    "brief_path": "Sprint 1/Task 1",
                    "agent_tool": "codex",
                    "diff_summary": "Added feature X",
                    "files_changed": [{"path": "app.py", "change_type": "added"}],
                    "intent_checks": [{"description": "Feature works"}],
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data["brief_path"] == "Sprint 1/Task 1"
            assert data["agent_tool"] == "codex"


@pytest.mark.asyncio
class TestSearchAPI:
    async def test_search_endpoint(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/search", params={"q": "test"})
            assert response.status_code == 200
            assert isinstance(response.json(), list)

    async def test_graph_endpoint(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/graph")
            assert response.status_code == 200
            data = response.json()
            assert "nodes" in data
            assert "edges" in data
