from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from mission_control.domain.models import BriefFilters, Brief
from mission_control.services.brief_service import BriefService
from mission_control.api.deps import get_brief_service, get_filesystem
from mission_control.api.schemas import (
    BriefCreate,
    BriefUpdate,
    BriefResponse,
    BriefDetailResponse,
    DashboardStats,
    FocusItem,
    ChecklistUpdateItem,
    DecisionCreate,
)
from mission_control.adapters.filesystem import FileSystemAdapter

router = APIRouter(prefix="/api/briefs", tags=["briefs"])


@router.get("", response_model=list[BriefResponse])
async def list_briefs(
    sprint: Optional[str] = None,
    folder: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = None,
    service: BriefService = Depends(get_brief_service),
):
    filters = BriefFilters(sprint=sprint, folder=folder, tag=tag, status=status)
    briefs = await service.list(filters)
    return [
        BriefResponse(
            id=b.id,
            folder_path=b.folder_path,
            title=b.title,
            status=b.status.value if hasattr(b.status, "value") else b.status,
            current_step=b.current_step,
            total_steps=b.total_steps,
            assigned_tool=b.assigned_tool,
            sprint_name=b.sprint_name,
            folder_name=b.folder_name,
            tags=b.tags,
            checklist_total=b.checklist_total,
            checklist_done=b.checklist_done,
            jira_key=b.jira_key,
            created_at=b.created_at,
        )
        for b in briefs
    ]


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    service: BriefService = Depends(get_brief_service),
):
    briefs = await service.list(None)
    stats = DashboardStats(
        total_briefs=len(briefs),
        drafts=sum(1 for b in briefs if b.status.value == "drafting" if hasattr(b.status, "value")),
        in_progress=sum(
            1 for b in briefs if b.status.value == "in_progress" if hasattr(b.status, "value")
        ),
        review=sum(1 for b in briefs if b.status.value == "review" if hasattr(b.status, "value")),
        done=sum(1 for b in briefs if b.status.value == "done" if hasattr(b.status, "value")),
        blocked=sum(1 for b in briefs if b.status.value == "blocked" if hasattr(b.status, "value")),
        total_sprints=len(set(b.sprint_name for b in briefs if b.sprint_name)),
    )
    return stats


@router.get("/focus", response_model=list[FocusItem])
async def get_focus_items(
    service: BriefService = Depends(get_brief_service),
):
    briefs = await service.list(None)
    in_progress = [
        b for b in briefs if b.status.value == "in_progress" if hasattr(b.status, "value")
    ]
    return [
        FocusItem(
            id=b.id,
            title=b.title,
            folder_path=b.folder_path,
            status=b.status.value if hasattr(b.status, "value") else b.status,
            priority=1,
        )
        for b in in_progress
    ]


@router.get("/{path:path}", response_model=BriefDetailResponse)
async def get_brief(
    path: str,
    service: BriefService = Depends(get_brief_service),
):
    brief = await service.get_by_path(path)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    return BriefDetailResponse(
        id=brief.id,
        folder_path=brief.folder_path,
        title=brief.title,
        status=brief.status.value if hasattr(brief.status, "value") else brief.status,
        current_step=brief.current_step,
        total_steps=brief.total_steps,
        assigned_tool=brief.assigned_tool,
        sprint_name=brief.sprint_name,
        folder_name=brief.folder_name,
        tags=brief.tags,
        checklist_total=brief.checklist_total,
        checklist_done=brief.checklist_done,
        jira_key=brief.jira_key,
        created_at=brief.created_at,
        goal=brief.goal,
        technical_details=brief.technical_details,
        constraints=brief.constraints,
        decisions=[d.model_dump() for d in brief.decisions],
        extracted_tags=brief.extracted_tags,
        parent_task_path=brief.parent_task_path,
        last_active_at=brief.last_active_at,
        indexed_at=brief.indexed_at,
    )


@router.post("", status_code=201)
async def create_brief(
    data: BriefCreate,
    service: BriefService = Depends(get_brief_service),
):
    brief = await service.create(
        sprint=data.sprint,
        folder=data.folder,
        name=data.name,
        template_type=data.template_type,
    )
    return BriefResponse(
        id=brief.id,
        folder_path=brief.folder_path,
        title=brief.title,
        status=brief.status.value if hasattr(brief.status, "value") else brief.status,
        created_at=brief.created_at,
    )


@router.put("/{path:path}")
async def update_brief(
    path: str,
    data: BriefUpdate,
    service: BriefService = Depends(get_brief_service),
):
    update_data = data.model_dump(exclude_unset=True)
    brief = await service.update(path, update_data)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    return BriefResponse(
        id=brief.id,
        folder_path=brief.folder_path,
        title=brief.title,
        status=brief.status.value if hasattr(brief.status, "value") else brief.status,
        current_step=brief.current_step,
        total_steps=brief.total_steps,
        assigned_tool=brief.assigned_tool,
        sprint_name=brief.sprint_name,
        folder_name=brief.folder_name,
        tags=brief.tags,
        checklist_total=brief.checklist_total,
        checklist_done=brief.checklist_done,
        jira_key=brief.jira_key,
        created_at=brief.created_at,
    )


@router.delete("/{path:path}")
async def delete_brief(
    path: str,
    service: BriefService = Depends(get_brief_service),
):
    success = await service.delete(path)
    if not success:
        raise HTTPException(status_code=404, detail="Brief not found")
    return {"status": "deleted"}


@router.put("/{path:path}/checklist")
async def update_checklist(
    path: str,
    items: list[ChecklistUpdateItem],
    service: BriefService = Depends(get_brief_service),
):
    item_dicts = [item.model_dump() for item in items]
    brief = await service.update_checklist(path, item_dicts)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    return {"checklist_total": brief.checklist_total, "checklist_done": brief.checklist_done}


@router.post("/{path:path}/decisions")
async def add_decision(
    path: str,
    decision: DecisionCreate,
    service: BriefService = Depends(get_brief_service),
):
    from mission_control.domain.models import Decision

    brief = await service.get_by_path(path)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    new_decision = Decision(text=decision.text, reason=decision.reason)
    brief.decisions.append(new_decision)
    await service.repository.save(brief)
    return {"decision": new_decision.model_dump()}


@router.post("/{path:path}/export")
async def export_context(
    path: str,
    service: BriefService = Depends(get_brief_service),
):
    from usecases.export_context import ExportContextUseCase
    from api.deps import get_exporter

    brief = await service.get_by_path(path)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    exporter = get_exporter()
    use_case = ExportContextUseCase(service.repository, exporter)
    result = await use_case.execute(path)
    return result


@router.post("/rebuild-index")
async def rebuild_index(
    service: BriefService = Depends(get_brief_service),
):
    result = await service.rebuild_index()
    return result
