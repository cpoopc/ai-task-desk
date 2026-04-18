from typing import Optional
from datetime import datetime, timezone

from mission_control.adapters.jira_client import JiraClient
from mission_control.config import get_settings


class SprintService:
    def __init__(self):
        self._sprints: dict[str, dict] = {}
        settings = get_settings()
        self._jira = JiraClient() if settings.jira_url else None

    async def list(self) -> list[dict]:
        return list(self._sprints.values())

    async def get(self, id: str) -> Optional[dict]:
        return self._sprints.get(id)

    async def create(
        self, name: str, start_date: str | None = None, end_date: str | None = None
    ) -> dict:
        sprint = {
            "id": name,
            "name": name,
            "start_date": start_date or datetime.now(timezone.utc).isoformat(),
            "end_date": end_date,
            "status": "active",
        }
        self._sprints[name] = sprint
        return sprint

    async def update(self, id: str, data: dict) -> Optional[dict]:
        if id not in self._sprints:
            return None
        self._sprints[id].update(data)
        return self._sprints[id]

    async def sync_from_jira(self, id: str) -> dict:
        if not self._jira:
            return {"synced": False, "error": "Jira not configured"}

        sprint_data = await self._jira.get_sprint(id)
        if not sprint_data:
            return {"synced": False, "error": "Sprint not found"}

        self._sprints[id] = {
            "id": id,
            "name": sprint_data.get("name", id),
            "state": sprint_data.get("state"),
            "start_date": sprint_data.get("startDate"),
            "end_date": sprint_data.get("endDate"),
            "status": "active" if sprint_data.get("state") == "ACTIVE" else "closed",
        }
        return {"synced": True, "sprint_id": id, "name": sprint_data.get("name")}
