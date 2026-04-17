from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from mission_control.domain.enums import Status, ReviewStatus, LinkType


class Decision(BaseModel):
    text: str
    made_at: datetime = Field(default_factory=datetime.utcnow)
    reason: Optional[str] = None


class FileChange(BaseModel):
    path: str
    change_type: str
    lines_added: int = 0
    lines_removed: int = 0


class IntentCheck(BaseModel):
    description: str
    passed: Optional[bool] = None
    notes: Optional[str] = None


class Feedback(BaseModel):
    approved: bool
    comments: str = ""
    ratings: dict[str, int] = Field(default_factory=dict)


class Brief(BaseModel):
    id: str = Field(..., description="唯一标识")
    folder_path: str = Field(..., description="文件夹路径")
    title: str
    status: Status = Status.drafting
    current_step: int = 0
    total_steps: int = 0
    assigned_tool: Optional[str] = None
    sprint_name: Optional[str] = None
    folder_name: Optional[str] = None
    parent_task_path: Optional[str] = None

    goal: str = ""
    technical_details: str = ""
    constraints: list[str] = Field(default_factory=list)
    decisions: list[Decision] = Field(default_factory=list)

    tags: list[str] = Field(default_factory=list)
    extracted_tags: list[str] = Field(default_factory=list)
    jira_key: Optional[str] = None

    checklist_total: int = 0
    checklist_done: int = 0

    relations: list[str] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: Optional[datetime] = None
    indexed_at: Optional[datetime] = None


class ReviewItem(BaseModel):
    id: str
    brief_path: str
    agent_tool: str
    status: ReviewStatus = ReviewStatus.pending
    diff_summary: str
    files_changed: list[FileChange] = Field(default_factory=list)
    intent_checks: list[IntentCheck] = Field(default_factory=list)
    feedback: Optional[Feedback] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None


class CrossTaskLink(BaseModel):
    id: str
    source_path: str
    target_path: str
    link_type: LinkType = LinkType.suggested
    match_method: str = "rule"
    score: float
    matched_tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: Optional[datetime] = None


class TimelineEvent(BaseModel):
    id: str
    brief_path: str
    event_type: str
    title: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Notification(BaseModel):
    id: str
    target_path: str
    source_path: str
    change_description: str
    status: str = "unread"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BriefFilters(BaseModel):
    sprint: Optional[str] = None
    folder: Optional[str] = None
    tag: Optional[str] = None
    status: Optional[str] = None
    search: Optional[str] = None
