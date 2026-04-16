from fastapi import APIRouter, Depends
from mission_control.services.sprint_service import SprintService
from mission_control.api.deps import get_sprint_service
from mission_control.api.schemas import SprintCreate, SprintUpdate, SprintResponse, SyncResult

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
    sprint = await service.create(data.name, data.start_date)
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
