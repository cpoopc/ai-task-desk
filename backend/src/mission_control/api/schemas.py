from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class BriefCreate(BaseModel):
    sprint: str
    folder: str
    name: str
    template_type: str = "default"


class BriefUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    current_step: Optional[int] = None
    total_steps: Optional[int] = None
    assigned_tool: Optional[str] = None
    tags: Optional[list[str]] = None
    jira_key: Optional[str] = None
    goal: Optional[str] = None
    technical_details: Optional[str] = None
    constraints: Optional[list[str]] = None
    relations: Optional[list[str]] = None


class ChecklistUpdateItem(BaseModel):
    text: str
    status: str = "todo"
    metadata: Optional[dict] = None


class DecisionCreate(BaseModel):
    text: str
    reason: Optional[str] = None


class BriefResponse(BaseModel):
    id: str
    folder_path: str
    title: str
    status: str
    current_step: int = 0
    total_steps: int = 0
    assigned_tool: Optional[str] = None
    sprint_name: Optional[str] = None
    folder_name: Optional[str] = None
    tags: list[str] = []
    checklist_total: int = 0
    checklist_done: int = 0
    jira_key: Optional[str] = None
    created_at: datetime


class BriefDetailResponse(BriefResponse):
    goal: str = ""
    technical_details: str = ""
    constraints: list[str] = []
    decisions: list[dict] = []
    extracted_tags: list[str] = []
    parent_task_path: Optional[str] = None
    last_active_at: Optional[datetime] = None
    indexed_at: Optional[datetime] = None
    relations: list[str] = []


class DashboardStats(BaseModel):
    total_briefs: int = 0
    drafts: int = 0
    in_progress: int = 0
    review: int = 0
    done: int = 0
    blocked: int = 0
    total_sprints: int = 0


class FocusItem(BaseModel):
    id: str
    title: str
    folder_path: str
    status: str
    priority: int = 0


class FolderCreate(BaseModel):
    name: str
    parent_path: Optional[str] = ""


class FolderUpdate(BaseModel):
    name: Optional[str] = None


class FolderResponse(BaseModel):
    name: str
    path: str
    type: str = "folder"
    children: list["FolderResponse"] = []


class SprintCreate(BaseModel):
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class SprintResponse(BaseModel):
    id: str
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "active"


class SyncResult(BaseModel):
    synced: bool
    sprint_id: str


class PlanUpdate(BaseModel):
    items: list[dict] = []


class DailySummary(BaseModel):
    date: str
    sprint: str
    completed: int = 0
    in_progress: int = 0
    blocked: int = 0
    upcoming: list[str] = []


class ReviewCreate(BaseModel):
    brief_path: str
    agent_tool: str
    diff_summary: str
    files_changed: list[dict] = []
    intent_checks: list[dict] = []


class FeedbackCreate(BaseModel):
    approved: bool
    comments: str = ""
    ratings: dict[str, int] = {}


class ReviewResponse(BaseModel):
    id: str
    brief_path: str
    agent_tool: str
    status: str
    diff_summary: str
    files_changed: list[dict] = []
    intent_checks: list[dict] = []
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None


class LinkResponse(BaseModel):
    id: str
    source_path: str
    target_path: str
    link_type: str
    score: float
    matched_tags: list[str] = []


class SearchResult(BaseModel):
    id: str
    title: str
    folder_path: str
    status: str
    score: float = 0.0


class GraphNode(BaseModel):
    id: str
    title: str
    path: str
    status: str


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str
    score: float = 0.0


class GraphData(BaseModel):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []


class RelationsUpdate(BaseModel):
    relations: list[str]


class RebuildIndexResponse(BaseModel):
    total: int
    sprints: int
