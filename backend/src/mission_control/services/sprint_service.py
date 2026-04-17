from typing import Optional
from datetime import datetime


class SprintService:
    def __init__(self):
        self._sprints: dict[str, dict] = {}

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
            "start_date": start_date or datetime.utcnow().isoformat(),
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
        return {"synced": True, "sprint_id": id}
