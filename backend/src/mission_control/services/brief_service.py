from __future__ import annotations
from pathlib import Path
from typing import Optional
from datetime import datetime
import uuid
import re

from mission_control.domain.models import Brief, BriefFilters, Decision
from mission_control.domain.enums import Status
from mission_control.adapters.filesystem import (
    FileSystemAdapter,
    TaskFolder,
    BriefContent,
    MetaContent,
    ChecklistContent,
)
from mission_control.repositories.brief_repo import BriefRepoAsyncSQLite


class BriefService:
    def __init__(
        self,
        repository: BriefRepoAsyncSQLite,
        filesystem: FileSystemAdapter,
    ):
        self.repository = repository
        self.fs = filesystem

    async def list(self, filters: BriefFilters | None = None) -> list[Brief]:
        return await self.repository.list(filters)

    async def get(self, id: str) -> Brief | None:
        return await self.repository.get(id)

    async def get_by_path(self, path: str) -> Brief | None:
        return await self.repository.get_by_path(path)

    async def create(
        self,
        sprint: str,
        folder: str,
        name: str,
        template_type: str = "default",
    ) -> Brief:
        folder_path = Path(sprint) / folder / name
        full_path = self.fs.root_path / folder_path

        task = await self.fs.create_task_folder(full_path, template_type, name)

        brief = Brief(
            id=str(uuid.uuid4()),
            folder_path=str(folder_path),
            title=name,
            status=Status.drafting,
            sprint_name=sprint,
            folder_name=folder,
        )

        await self.repository.save(brief)
        return brief

    async def update(self, path: str, data: dict) -> Brief | None:
        existing = await self.repository.get_by_path(path)
        if not existing:
            return None

        if "title" in data:
            existing.title = data["title"]
        if "status" in data:
            existing.status = Status(data["status"])
        if "current_step" in data:
            existing.current_step = data["current_step"]
        if "total_steps" in data:
            existing.total_steps = data["total_steps"]
        if "assigned_tool" in data:
            existing.assigned_tool = data["assigned_tool"]
        if "tags" in data:
            existing.tags = data["tags"]
        if "jira_key" in data:
            existing.jira_key = data["jira_key"]
        if "goal" in data:
            existing.goal = data["goal"]
        if "technical_details" in data:
            existing.technical_details = data["technical_details"]
        if "constraints" in data:
            existing.constraints = data["constraints"]

        existing.last_active_at = datetime.utcnow()

        full_path = self.fs.root_path / path
        if full_path.exists():
            meta = MetaContent(
                status=existing.status.value,
                current_step=existing.current_step,
                total_steps=existing.total_steps,
                assigned_tool=existing.assigned_tool,
                jira_key=existing.jira_key,
                tags=existing.tags,
                last_activity=f"Updated at {datetime.utcnow().isoformat()}",
            )
            self.fs.update_meta(full_path, meta)

        await self.repository.save(existing)
        return existing

    async def delete(self, path: str) -> bool:
        brief = await self.repository.get_by_path(path)
        if not brief:
            return False

        full_path = self.fs.root_path / path
        if full_path.exists():
            import shutil

            shutil.rmtree(full_path)

        await self.repository.delete(brief.id)
        return True

    async def parse_from_filesystem(self, path: str | Path) -> Brief | None:
        if isinstance(path, str):
            path = Path(path)

        if not path.is_absolute():
            path = self.fs.root_path / path

        task = self.fs.parse_task(path)
        if not task:
            return None

        brief_content = task.brief
        meta = task.meta
        checklist = task.checklist

        folder_path_str = str(path.relative_to(self.fs.root_path))

        parts = folder_path_str.split("/")
        sprint_name = parts[0] if len(parts) > 0 else None
        folder_name = parts[1] if len(parts) > 1 else None
        title = (
            meta.template_type
            if (meta and meta.template_type)
            else (brief_content.title if brief_content else folder_path_str.split("/")[-1])
        )

        status = Status.drafting
        if meta and meta.status:
            try:
                status = Status(meta.status)
            except ValueError:
                status = Status.drafting

        parent_parts = folder_path_str.split("/")
        parent_task_path = None
        if len(parent_parts) > 3:
            parent_task_path = "/".join(parent_parts[:-1])

        decisions = []
        if task.decisions:
            decisions = [Decision(text=d) for d in task.decisions.decisions]

        total = len(checklist.items) if checklist else 0
        done = sum(1 for item in (checklist.items if checklist else []) if item.status == "done")

        return Brief(
            id=str(uuid.uuid4()),
            folder_path=folder_path_str,
            title=title,
            status=status,
            current_step=meta.current_step if meta else 0,
            total_steps=meta.total_steps if meta else 0,
            assigned_tool=meta.assigned_tool if meta else None,
            sprint_name=sprint_name,
            folder_name=folder_name,
            parent_task_path=parent_task_path,
            goal=brief_content.goal if brief_content else "",
            technical_details=brief_content.technical_details if brief_content else "",
            constraints=brief_content.constraints if brief_content else [],
            decisions=decisions,
            tags=meta.tags if meta and meta.tags else [],
            extracted_tags=[],
            jira_key=meta.jira_key if meta else None,
            checklist_total=total,
            checklist_done=done,
            created_at=datetime.utcnow(),
            last_active_at=datetime.utcnow(),
            indexed_at=datetime.utcnow(),
        )

    async def update_checklist(self, path: str, items: list[dict]) -> Brief | None:
        brief = await self.repository.get_by_path(path)
        if not brief:
            return None

        full_path = self.fs.root_path / path
        checklist = ChecklistContent(
            items=[
                {
                    "text": item.get("text", ""),
                    "status": item.get("status", "todo"),
                    "metadata": item.get("metadata"),
                }
                for item in items
            ]
        )

        from dataclasses import asdict

        checklist_data = asdict(checklist)
        checklist_content = ChecklistContent(
            items=[
                type(
                    "Item",
                    (),
                    {
                        "text": item["text"],
                        "status": item["status"],
                        "metadata": item.get("metadata"),
                    },
                )()
                for item in items
            ]
        )

        self.fs.update_checklist(full_path, checklist_content)

        brief.checklist_total = len(items)
        brief.checklist_done = sum(1 for item in items if item.get("status") == "done")
        brief.last_active_at = datetime.utcnow()

        await self.repository.save(brief)
        return brief

    async def search(self, query: str) -> list[Brief]:
        return await self.repository.search(query)

    async def rebuild_index(self) -> dict:
        tasks = self.fs.walk_tasks()
        briefs = []

        for task in tasks:
            brief = await self._task_folder_to_brief(task)
            if brief:
                briefs.append(brief)
                await self.repository.save(brief)

        return {
            "total": len(briefs),
            "sprints": len(set(b.sprint_name for b in briefs if b.sprint_name)),
        }

    async def _task_folder_to_brief(self, task: TaskFolder) -> Brief | None:
        folder_path_str = str(task.path.relative_to(self.fs.root_path))

        parts = folder_path_str.split("/")
        sprint_name = parts[0] if len(parts) > 0 else None
        folder_name = parts[1] if len(parts) > 1 else None

        title = (
            task.meta.template_type
            if (task.meta and task.meta.template_type)
            else (task.brief.title if task.brief else parts[-1])
        )

        status = Status.drafting
        if task.meta and task.meta.status:
            try:
                status = Status(task.meta.status)
            except ValueError:
                status = Status.drafting

        parent_parts = folder_path_str.split("/")
        parent_task_path = None
        if len(parent_parts) > 3:
            parent_task_path = "/".join(parent_parts[:-1])

        decisions = []
        if task.decisions:
            decisions = [Decision(text=d) for d in task.decisions.decisions]

        total = len(task.checklist.items) if task.checklist else 0
        done = sum(
            1 for item in (task.checklist.items if task.checklist else []) if item.status == "done"
        )

        return Brief(
            id=str(uuid.uuid4()),
            folder_path=folder_path_str,
            title=title,
            status=status,
            current_step=task.meta.current_step if task.meta else 0,
            total_steps=task.meta.total_steps if task.meta else 0,
            assigned_tool=task.meta.assigned_tool if task.meta else None,
            sprint_name=sprint_name,
            folder_name=folder_name,
            parent_task_path=parent_task_path,
            goal=task.brief.goal if task.brief else "",
            technical_details=task.brief.technical_details if task.brief else "",
            constraints=task.brief.constraints if task.brief else [],
            decisions=decisions,
            tags=task.meta.tags if task.meta and task.meta.tags else [],
            extracted_tags=[],
            jira_key=task.meta.jira_key if task.meta else None,
            checklist_total=total,
            checklist_done=done,
            created_at=datetime.utcnow(),
            last_active_at=datetime.utcnow(),
            indexed_at=datetime.utcnow(),
        )
