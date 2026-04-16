from typing import Optional
from datetime import datetime, timedelta


class PlanService:
    def __init__(self):
        self._plans: dict[str, dict] = {}

    async def get_plan(self, sprint: str) -> Optional[dict]:
        return self._plans.get(sprint)

    async def update_plan(self, sprint: str, data: dict) -> dict:
        plan = self._plans.get(sprint, {"sprint": sprint, "items": []})
        plan.update(data)
        self._plans[sprint] = plan
        return plan

    async def rebalance_plan(self, sprint: str) -> dict:
        plan = self._plans.get(sprint)
        if not plan:
            return {"error": "Plan not found"}
        return plan

    async def generate_daily_summary(self, sprint: str) -> dict:
        today = datetime.utcnow().date()
        return {
            "date": today.isoformat(),
            "sprint": sprint,
            "completed": 0,
            "in_progress": 0,
            "blocked": 0,
            "upcoming": [],
        }
