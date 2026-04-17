from fastapi import APIRouter, Depends
from mission_control.services.plan_service import PlanService
from mission_control.api.deps import get_plan_service
from mission_control.api.schemas import PlanUpdate, DailySummary, DisruptionRequest

router = APIRouter(prefix="/api/plan", tags=["plan"])


@router.get("/{sprint}")
async def get_plan(
    sprint: str,
    service: PlanService = Depends(get_plan_service),
):
    plan = await service.get_plan(sprint)
    if not plan:
        return {"sprint": sprint, "items": []}
    return plan


@router.put("/{sprint}")
async def update_plan(
    sprint: str,
    data: PlanUpdate,
    service: PlanService = Depends(get_plan_service),
):
    plan = await service.update_plan(sprint, data.model_dump())
    return plan


@router.post("/{sprint}/rebalance")
async def rebalance_plan(
    sprint: str,
    service: PlanService = Depends(get_plan_service),
):
    result = await service.rebalance_plan(sprint)
    return result


@router.post("/{sprint}/daily-summary", response_model=DailySummary)
async def generate_daily_summary(
    sprint: str,
    service: PlanService = Depends(get_plan_service),
):
    summary = await service.generate_daily_summary(sprint)
    return DailySummary(**summary)


@router.post("/{sprint}/disruption")
async def handle_disruption(
    sprint: str,
    request: DisruptionRequest,
    service: PlanService = Depends(get_plan_service),
):
    result = await service.handle_disruption(sprint, request.disruption_type, request.data)
    return result
