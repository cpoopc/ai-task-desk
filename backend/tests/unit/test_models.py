import pytest
from datetime import datetime
from mission_control.domain.models import (
    Brief,
    ReviewItem,
    CrossTaskLink,
    TimelineEvent,
    Notification,
    Decision,
    FileChange,
    IntentCheck,
    Feedback,
    BriefFilters,
)
from mission_control.domain.enums import Status, ReviewStatus, LinkType


class TestBriefModel:
    def test_brief_creation(self):
        brief = Brief(
            id="test-1",
            folder_path="Sprint 1/Task 1",
            title="Test Brief",
        )
        assert brief.id == "test-1"
        assert brief.folder_path == "Sprint 1/Task 1"
        assert brief.title == "Test Brief"
        assert brief.status == Status.drafting
        assert brief.current_step == 0
        assert brief.total_steps == 0
        assert brief.goal == ""
        assert brief.constraints == []
        assert brief.decisions == []
        assert brief.tags == []
        assert brief.extracted_tags == []

    def test_brief_with_full_data(self):
        brief = Brief(
            id="test-2",
            folder_path="Sprint 1/Task 2",
            title="Full Brief",
            status=Status.in_progress,
            current_step=1,
            total_steps=3,
            assigned_tool="cursor",
            sprint_name="Sprint 1",
            folder_name="Task 2",
            goal="Implement feature X",
            technical_details="Use Python",
            constraints=["No breaking changes"],
            tags=["backend"],
            jira_key="TEST-456",
            checklist_total=10,
            checklist_done=5,
        )
        assert brief.status == Status.in_progress
        assert brief.current_step == 1
        assert brief.total_steps == 3
        assert brief.assigned_tool == "cursor"
        assert brief.goal == "Implement feature X"
        assert brief.jira_key == "TEST-456"
        assert brief.checklist_total == 10
        assert brief.checklist_done == 5

    def test_brief_default_values(self):
        brief = Brief(id="test-3", folder_path="path", title="Title")
        assert brief.status == Status.drafting
        assert brief.current_step == 0
        assert brief.total_steps == 0
        assert brief.created_at is not None
        assert brief.indexed_at is None

    def test_brief_status_enum(self):
        assert Status.drafting.value == "drafting"
        assert Status.planned.value == "planned"
        assert Status.in_progress.value == "in_progress"
        assert Status.review.value == "review"
        assert Status.done.value == "done"
        assert Status.blocked.value == "blocked"
        assert Status.cancelled.value == "cancelled"


class TestReviewItemModel:
    def test_review_item_creation(self):
        review = ReviewItem(
            id="review-1",
            brief_path="Sprint 1/Task 1",
            agent_tool="codex",
            diff_summary="Added new feature",
        )
        assert review.id == "review-1"
        assert review.brief_path == "Sprint 1/Task 1"
        assert review.agent_tool == "codex"
        assert review.status == ReviewStatus.pending
        assert review.diff_summary == "Added new feature"
        assert review.files_changed == []
        assert review.intent_checks == []

    def test_review_item_with_details(self):
        files = [
            FileChange(path="src/app.py", change_type="modified", lines_added=10, lines_removed=2)
        ]
        checks = [IntentCheck(description="Feature works", passed=True)]
        feedback = Feedback(approved=True, comments="LGTM", ratings={"quality": 5})

        review = ReviewItem(
            id="review-2",
            brief_path="Sprint 1/Task 2",
            agent_tool="claude",
            diff_summary="Refactored code",
            files_changed=files,
            intent_checks=checks,
            feedback=feedback,
        )
        assert len(review.files_changed) == 1
        assert review.files_changed[0].path == "src/app.py"
        assert review.intent_checks[0].description == "Feature works"
        assert review.feedback.approved is True


class TestCrossTaskLinkModel:
    def test_cross_task_link_creation(self):
        link = CrossTaskLink(
            id="link-1",
            source_path="Sprint 1/Task 1",
            target_path="Sprint 1/Task 2",
            score=0.75,
            matched_tags=["backend", "api"],
        )
        assert link.id == "link-1"
        assert link.source_path == "Sprint 1/Task 1"
        assert link.target_path == "Sprint 1/Task 2"
        assert link.link_type == LinkType.suggested
        assert link.score == 0.75
        assert link.match_method == "rule"

    def test_cross_task_link_auto_type(self):
        link = CrossTaskLink(
            id="link-2",
            source_path="A",
            target_path="B",
            link_type=LinkType.auto,
            score=0.85,
            matched_tags=["redis"],
        )
        assert link.link_type == LinkType.auto


class TestDecisionModel:
    def test_decision_creation(self):
        decision = Decision(text="Use FastAPI for web framework")
        assert decision.text == "Use FastAPI for web framework"
        assert decision.reason is None
        assert decision.made_at is not None

    def test_decision_with_reason(self):
        decision = Decision(
            text="Use PostgreSQL",
            reason="Better for complex queries",
        )
        assert decision.reason == "Better for complex queries"


class TestBriefFilters:
    def test_brief_filters_empty(self):
        filters = BriefFilters()
        assert filters.sprint is None
        assert filters.folder is None
        assert filters.tag is None
        assert filters.status is None
        assert filters.search is None

    def test_brief_filters_with_values(self):
        filters = BriefFilters(
            sprint="Sprint 1",
            folder="Backend",
            tag="api",
            status="in_progress",
            search="authentication",
        )
        assert filters.sprint == "Sprint 1"
        assert filters.status == "in_progress"
        assert filters.search == "authentication"


class TestNotificationModel:
    def test_notification_creation(self):
        notification = Notification(
            id="notif-1",
            target_path="Sprint 1/Task 1",
            source_path="Sprint 1/Task 2",
            change_description="Updated brief.md",
        )
        assert notification.id == "notif-1"
        assert notification.status == "unread"
        assert notification.change_description == "Updated brief.md"
