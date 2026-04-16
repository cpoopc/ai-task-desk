from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DomainEvent(BaseModel):
    event_type: str
    timestamp: datetime
    aggregate_id: str


class BriefCreatedEvent(DomainEvent):
    folder_path: str
    template_type: Optional[str] = None


class BriefUpdatedEvent(DomainEvent):
    folder_path: str
    changes: dict


class BriefDeletedEvent(DomainEvent):
    folder_path: str


class ChecklistUpdatedEvent(DomainEvent):
    folder_path: str
    checklist_total: int
    checklist_done: int


class LinkDetectedEvent(DomainEvent):
    source_path: str
    target_path: str
    score: float
