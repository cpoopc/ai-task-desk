import base64

import httpx

from mission_control.config import get_settings


class JiraClient:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.jira_url
        self.username = settings.jira_username
        self.token = settings.jira_api_token

    def _headers(self) -> dict[str, str]:
        auth = base64.b64encode(f"{self.username}:{self.token}".encode()).decode()
        return {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def get_sprint(self, sprint_id: str) -> dict | None:
        if not self.base_url:
            return None
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{self.base_url}/rest/agile/1.0/sprint/{sprint_id}",
                    headers=self._headers(),
                    timeout=10,
                )
                if resp.status_code == 200:
                    return resp.json()
            except Exception:
                pass
        return None
