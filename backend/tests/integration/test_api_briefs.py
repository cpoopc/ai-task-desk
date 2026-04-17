import pytest
from httpx import AsyncClient, ASGITransport
from mission_control.main import app


@pytest.mark.asyncio
class TestBriefsAPI:
    async def test_list_briefs_empty(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/briefs")
            assert response.status_code == 200
            assert response.json() == []

    async def test_get_brief_stats(self):
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
            assert "total_sprints" in data

    async def test_get_focus_items(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/briefs/focus")
            assert response.status_code == 200
            assert isinstance(response.json(), list)

    async def test_list_briefs_with_filters(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/briefs?sprint=Sprint 1&status=in_progress")
            assert response.status_code == 200
            assert isinstance(response.json(), list)


@pytest.mark.asyncio
class TestBriefsAPICRUD:
    async def test_get_brief_not_found(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/briefs/nonexistent/path")
            assert response.status_code == 404
            assert response.json()["detail"] == "Brief not found"

    async def test_update_brief_not_found(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put("/api/briefs/nonexistent/path", json={"title": "New Title"})
            assert response.status_code == 404
            assert response.json()["detail"] == "Brief not found"

    async def test_delete_brief_not_found(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/briefs/nonexistent/path")
            assert response.status_code == 404
            assert response.json()["detail"] == "Brief not found"

    async def test_get_subtasks_not_found(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/briefs/nonexistent/path/subtasks")
            assert response.status_code == 200
            assert response.json() == []

    async def test_rebuild_index(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/briefs/rebuild-index")
            assert response.status_code == 200
            data = response.json()
            assert "total" in data
            assert "sprints" in data


@pytest.mark.asyncio
class TestBriefsAPIValidation:
    async def test_update_brief_invalid_status(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/briefs/Sprint 1/Task 1", json={"status": "invalid_status"}
            )
            assert response.status_code in [404, 400, 422]

    async def test_add_decision_not_found(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/briefs/nonexistent/path/decisions",
                json={"text": "Decision text", "reason": "Because"},
            )
            assert response.status_code == 404
            assert response.json()["detail"] == "Brief not found"

    async def test_update_relations_not_found(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/briefs/nonexistent/path/relations",
                json={"relations": ["blocks:Sprint 1/Task 2"]},
            )
            assert response.status_code == 404
            assert response.json()["detail"] == "Brief not found"

    async def test_update_relations_invalid_format(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/briefs/Sprint 1/Task 1/relations", json={"relations": "not a list"}
            )
            assert response.status_code == 422
