from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from mission_control.services.sprint_service import SprintService
from mission_control.api.deps import get_sprint_service
from mission_control.api.schemas import (
    SprintCreate,
    SprintUpdate,
    SprintResponse,
    SyncResult,
    SprintProgress,
    SprintSummary,
    TaskStats,
)

router = APIRouter(prefix="/api/sprints", tags=["sprints"])


@router.get("", response_model=list[SprintResponse])
async def list_sprints(
    service: SprintService = Depends(get_sprint_service),
):
    sprints = await service.list()
    return [SprintResponse(**s) for s in sprints]


@router.post("", response_model=SprintResponse)
async def create_sprint(
    data: SprintCreate,
    service: SprintService = Depends(get_sprint_service),
):
    sprint = await service.create(data.name, data.start_date, data.end_date)
    return SprintResponse(**sprint)


@router.put("/{id}")
async def update_sprint(
    id: str,
    data: SprintUpdate,
    service: SprintService = Depends(get_sprint_service),
):
    sprint = await service.update(id, data.model_dump(exclude_unset=True))
    if not sprint:
        return {"error": "Sprint not found"}
    return sprint


@router.post("/{id}/sync-jira", response_model=SyncResult)
async def sync_from_jira(
    id: str,
    service: SprintService = Depends(get_sprint_service),
):
    result = await service.sync_from_jira(id)
    return SyncResult(**result)


@router.get("/{id}/progress", response_model=SprintProgress)
async def get_sprint_progress(
    id: str,
    service: SprintService = Depends(get_sprint_service),
):
    sprint = await service.get(id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    start_date_str = sprint.get("start_date")
    end_date_str = sprint.get("end_date")

    if not start_date_str or not end_date_str:
        return SprintProgress(
            sprint_id=id,
            sprint_name=sprint.get("name", ""),
            days_elapsed=0,
            days_total=0,
            days_remaining=0,
            percent_complete=0.0,
            task_stats=TaskStats(),
            velocity=0.0,
            at_risk=False,
        )

    start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
    end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
    today = datetime.utcnow()

    days_elapsed = max(0, (today - start_date.replace(tzinfo=None)).days)
    days_total = max(1, (end_date.replace(tzinfo=None) - start_date.replace(tzinfo=None)).days)
    days_remaining = max(0, days_total - days_elapsed)
    percent_complete = min(100.0, max(0.0, (days_elapsed / days_total) * 100))

    task_stats = TaskStats()
    velocity = 0.0
    at_risk = False

    return SprintProgress(
        sprint_id=id,
        sprint_name=sprint.get("name", ""),
        days_elapsed=days_elapsed,
        days_total=days_total,
        days_remaining=days_remaining,
        percent_complete=round(percent_complete, 1),
        task_stats=task_stats,
        velocity=round(velocity, 2),
        at_risk=at_risk,
    )


@router.get("/{id}/summary", response_model=SprintSummary)
async def get_sprint_summary(
    id: str,
    service: SprintService = Depends(get_sprint_service),
):
    sprint = await service.get(id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")

    start_date_str = sprint.get("start_date")
    end_date_str = sprint.get("end_date")

    tasks_by_status = {"todo": 0, "in_progress": 0, "review": 0, "done": 0, "blocked": 0}
    blockers = []
    upcoming_deadlines = []
    recommendations = []

    total_tasks = sum(tasks_by_status.values())
    completed_tasks = tasks_by_status.get("done", 0)
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    if end_date_str:
        end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
        today = datetime.utcnow()
        days_left = (end_date.replace(tzinfo=None) - today.replace(tzinfo=None)).days
        if days_left < 2 and days_left >= 0:
            recommendations.append(f"Sprint ends in {days_left} day(s) - wrap up remaining tasks!")

    return SprintSummary(
        sprint_name=sprint.get("name", ""),
        start_date=start_date_str,
        end_date=end_date_str,
        status=sprint.get("status", "active"),
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_rate=round(completion_rate, 1),
        tasks_by_status=tasks_by_status,
        blockers=blockers,
        upcoming_deadlines=upcoming_deadlines,
        recommendations=recommendations,
    )
