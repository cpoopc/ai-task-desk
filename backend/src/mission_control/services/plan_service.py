from typing import Optional
from datetime import datetime, timedelta, timezone


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

    async def handle_disruption(self, sprint: str, disruption_type: str, data: dict) -> dict:
        plan = self._plans.get(sprint)
        if not plan:
            return {"error": "Plan not found"}

        if disruption_type == "urgent_task":
            task_name = data.get("task_name")
            priority = data.get("priority", "high")
            deadline = data.get("deadline")
            defer_lower = data.get("defer_lower_priority", False)
            new_task = {
                "taskId": f"urgent-{datetime.now(timezone.utc).timestamp()}",
                "title": task_name,
                "estimatedTime": data.get("estimated_time", "1h"),
                "action": "Urgent task added",
                "priority": priority,
                "deadline": deadline,
                "is_urgent": True,
            }
            if "items" not in plan:
                plan["items"] = []
            plan["items"].insert(0, new_task)
            if defer_lower:
                plan["items"] = [t for t in plan["items"] if t.get("priority") != "low"]
            self._plans[sprint] = plan
            return {"status": "ok", "action": "urgent_task_added", "task": new_task}

        elif disruption_type == "reduced_capacity":
            start_date = data.get("start_date")
            end_date = data.get("end_date")
            percentage = data.get("percentage", 50)
            if "capacity_reduction" not in plan:
                plan["capacity_reduction"] = []
            plan["capacity_reduction"].append(
                {"start_date": start_date, "end_date": end_date, "percentage": percentage}
            )
            self._plans[sprint] = plan
            return {
                "status": "ok",
                "action": "capacity_reduced",
                "reduction": plan["capacity_reduction"][-1],
            }

        elif disruption_type == "scope_change":
            add_tasks = data.get("add_tasks", [])
            remove_task_ids = data.get("remove_task_ids", [])
            reason = data.get("reason", "")
            if "items" not in plan:
                plan["items"] = []
            for task in add_tasks:
                task["taskId"] = task.get(
                    "taskId", f"scope-{datetime.now(timezone.utc).timestamp()}"
                )
                task["action"] = f"Added via scope change: {reason}"
                plan["items"].append(task)
            plan["items"] = [t for t in plan["items"] if t.get("taskId") not in remove_task_ids]
            self._plans[sprint] = plan
            return {
                "status": "ok",
                "action": "scope_changed",
                "changes": {"added": len(add_tasks), "removed": len(remove_task_ids)},
            }

        return {"error": f"Unknown disruption type: {disruption_type}"}

    async def generate_daily_summary(self, sprint: str) -> dict:
        today = datetime.now(timezone.utc).date()
        plan = self._plans.get(sprint, {})
        items = plan.get("items", [])
        completed_yesterday = [t for t in items if t.get("status") == "done"]
        planned_today = [t for t in items if t.get("status") == "planned" or t.get("is_urgent")]
        blockers = [t for t in items if t.get("blocked")]
        recommendations = []
        if len(blockers) > 2:
            recommendations.append("High blocker count - consider escalating or reassigning")
        if plan.get("capacity_reduction"):
            recommendations.append("Capacity reduced - prioritize essential tasks only")
        return {
            "date": today.isoformat(),
            "sprint": sprint,
            "completed_yesterday": len(completed_yesterday),
            "planned_today": len(planned_today),
            "completed": len(completed_yesterday),
            "in_progress": len([t for t in items if t.get("status") == "in_progress"]),
            "blocked": len(blockers),
            "blockers": [
                {
                    "task_id": t.get("taskId"),
                    "title": t.get("title"),
                    "reason": t.get("block_reason", "Unknown"),
                }
                for t in blockers
            ],
            "upcoming": [t.get("title") for t in planned_today[:5]],
            "recommendations": recommendations,
        }
