from enum import Enum


class Status(str, Enum):
    drafting = "drafting"
    planned = "planned"
    in_progress = "in_progress"
    review = "review"
    done = "done"
    blocked = "blocked"
    cancelled = "cancelled"


class ReviewStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    changes_requested = "changes_requested"
    skipped = "skipped"


class LinkType(str, Enum):
    suggested = "suggested"
    confirmed = "confirmed"
    auto = "auto"


class ChangeType(str, Enum):
    created = "created"
    modified = "modified"
    deleted = "deleted"
    moved = "moved"
