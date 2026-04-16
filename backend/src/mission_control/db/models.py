from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, Index
from datetime import datetime
import uuid


class BriefIndex(SQLModel, table=True):
    __tablename__ = "briefs_index"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    folder_path: str = Field(..., unique=True, index=True)
    title: str | None = None
    status: str = "drafting"
    current_step: int = 0
    total_steps: int = 0
    assigned_tool: str | None = None
    sprint_name: str | None = Field(default=None, index=True)
    folder_name: str | None = Field(default=None, index=True)
    parent_task_path: str | None = Field(default=None, index=True)
    user_tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    extracted_tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    checklist_total: int = 0
    checklist_done: int = 0
    is_hidden: bool = False
    jira_key: str | None = None
    last_activity: str | None = None
    last_active_at: datetime | None = None
    indexed_at: datetime = Field(default_factory=datetime.utcnow)


class ReviewItemDB(SQLModel, table=True):
    __tablename__ = "review_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    brief_path: str = Field(..., index=True)
    agent_tool: str | None = None
    status: str = "pending"
    diff_summary: str | None = None
    files_changed: list = Field(default_factory=list, sa_column=Column(JSON))
    intent_checks: list = Field(default_factory=list, sa_column=Column(JSON))
    feedback: dict | None = Field(default=None, sa_column=Column(JSON))
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: datetime | None = None


class CrossTaskLinkDB(SQLModel, table=True):
    __tablename__ = "cross_task_links"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    source_path: str = Field(..., index=True)
    target_path: str = Field(..., index=True)
    link_type: str = "suggested"
    match_method: str | None = None
    score: float = 0.0
    matched_tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: datetime | None = None


class TimelineEventDB(SQLModel, table=True):
    __tablename__ = "timeline_events"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    brief_path: str = Field(..., index=True)
    event_type: str
    title: str
    detail: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class NotificationDB(SQLModel, table=True):
    __tablename__ = "notifications"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    target_path: str = Field(..., index=True)
    source_path: str
    change_description: str
    status: str = "unread"
    created_at: datetime = Field(default_factory=datetime.utcnow)
