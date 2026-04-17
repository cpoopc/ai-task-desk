import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from mission_control.adapters.filesystem import FileSystemAdapter
from mission_control.config import get_settings
from mission_control.db.models import BriefIndex, ReviewItemDB

settings = get_settings()


class FileBridge:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.fs_adapter = FileSystemAdapter(root_path=settings.mc_root)

    async def sync_to_db(self) -> dict:
        tasks = self.fs_adapter.walk_tasks()
        synced_briefs = 0
        synced_reviews = 0

        for task in tasks:
            brief_index = await self._sync_task_to_db(task)
            if brief_index:
                synced_briefs += 1

            review = await self._sync_review_to_db(task)
            if review:
                synced_reviews += 1

        await self.session.commit()
        return {
            "briefs": synced_briefs,
            "reviews": synced_reviews,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def sync_to_files(self) -> dict:
        result = await self.session.execute(select(BriefIndex))
        briefs = result.scalars().all()
        synced = 0

        for brief in briefs:
            folder_path = Path(brief.folder_path)
            if folder_path.exists():
                await self._sync_brief_to_files(brief)
                synced += 1

        return {
            "briefs": synced,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def _sync_task_to_db(self, task) -> BriefIndex | None:
        folder_path = str(task.path)

        result = await self.session.execute(
            select(BriefIndex).where(BriefIndex.folder_path == folder_path)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.title = task.brief.title if task.brief else existing.title
            existing.status = task.meta.status if task.meta else existing.status
            existing.current_step = task.meta.current_step if task.meta else existing.current_step
            existing.total_steps = task.meta.total_steps if task.meta else existing.total_steps
            existing.assigned_tool = (
                task.meta.assigned_tool if task.meta else existing.assigned_tool
            )
            existing.jira_key = task.meta.jira_key if task.meta else existing.jira_key
            existing.tags = task.meta.tags if task.meta else existing.tags
            existing.last_activity = (
                task.meta.last_activity if task.meta else existing.last_activity
            )
            existing.last_active_at = (
                datetime.fromisoformat(task.meta.last_active_at)
                if task.meta and task.meta.last_active_at
                else None
            )
            if task.checklist:
                existing.checklist_total = len(task.checklist.items)
                existing.checklist_done = sum(1 for i in task.checklist.items if i.status == "done")
            return existing
        else:
            brief_index = BriefIndex(
                folder_path=folder_path,
                title=task.brief.title if task.brief else None,
                status=task.meta.status if task.meta else "drafting",
                current_step=task.meta.current_step if task.meta else 0,
                total_steps=task.meta.total_steps if task.meta else 0,
                assigned_tool=task.meta.assigned_tool if task.meta else None,
                jira_key=task.meta.jira_key if task.meta else None,
                tags=task.meta.tags if task.meta else [],
                last_activity=task.meta.last_activity if task.meta else None,
                last_active_at=(
                    datetime.fromisoformat(task.meta.last_active_at)
                    if task.meta and task.meta.last_active_at
                    else None
                ),
            )
            if task.checklist:
                brief_index.checklist_total = len(task.checklist.items)
                brief_index.checklist_done = sum(
                    1 for i in task.checklist.items if i.status == "done"
                )
            self.session.add(brief_index)
            return brief_index

    async def _sync_review_to_db(self, task) -> ReviewItemDB | None:
        review_file = task.path / ".review.json"
        if not review_file.exists():
            return None

        try:
            review_data = json.loads(review_file.read_text())
        except (OSError, json.JSONDecodeError):
            return None

        result = await self.session.execute(
            select(ReviewItemDB).where(ReviewItemDB.brief_path == str(task.path))
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.status = review_data.get("status", existing.status)
            existing.diff_summary = review_data.get("diff_summary", existing.diff_summary)
            existing.feedback = review_data.get("feedback", existing.feedback)
            return existing
        else:
            review = ReviewItemDB(
                brief_path=str(task.path),
                agent_tool=review_data.get("agent_tool"),
                status=review_data.get("status", "pending"),
                diff_summary=review_data.get("diff_summary"),
                files_changed=review_data.get("files_changed", []),
                intent_checks=review_data.get("intent_checks", []),
                feedback=review_data.get("feedback"),
            )
            self.session.add(review)
            return review

    async def _sync_brief_to_files(self, brief: BriefIndex) -> None:
        folder_path = Path(brief.folder_path)
        if not folder_path.exists():
            return

        meta_file = folder_path / ".meta.yaml"
        if meta_file.exists():
            import yaml

            meta_data = yaml.safe_load(meta_file.read_text()) or {}
        else:
            meta_data = {}

        meta_data["status"] = brief.status
        meta_data["currentStep"] = brief.current_step
        meta_data["totalSteps"] = brief.total_steps
        meta_data["assignedTool"] = brief.assigned_tool
        meta_data["jiraKey"] = brief.jira_key
        meta_data["tags"] = brief.tags or []
        meta_data["lastActivity"] = brief.last_activity
        meta_data["lastActiveAt"] = (
            brief.last_active_at.isoformat() if brief.last_active_at else None
        )

        meta_file.write_text(yaml.dump(meta_data))


@asynccontextmanager
async def get_file_bridge(session: AsyncSession):
    bridge = FileBridge(session)
    yield bridge
