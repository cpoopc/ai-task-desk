from __future__ import annotations
from typing import Optional
from datetime import datetime, timezone
from sqlmodel import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from mission_control.domain.models import Brief, BriefFilters, Decision
from mission_control.domain.enums import Status
from mission_control.db.models import BriefIndex, TimelineEventDB
from mission_control.repositories.base import BriefRepository


class BriefRepoAsyncSQLite(BriefRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, id: str) -> Brief | None:
        result = await self.session.get(BriefIndex, id)
        if result:
            return self._to_domain(result)
        return None

    async def list(self, filters: BriefFilters | None = None) -> list[Brief]:
        stmt = select(BriefIndex)
        if filters:
            if filters.sprint:
                stmt = stmt.where(BriefIndex.sprint_name == filters.sprint)
            if filters.folder:
                stmt = stmt.where(BriefIndex.folder_name == filters.folder)
            if filters.tag:
                stmt = stmt.where(BriefIndex.user_tags.contains([filters.tag]))
            if filters.status:
                stmt = stmt.where(BriefIndex.status == filters.status)
            if filters.search:
                search_term = f"%{filters.search}%"
                stmt = stmt.where(
                    (BriefIndex.title.contains(search_term))
                    | (BriefIndex.folder_path.contains(search_term))
                )

        stmt = stmt.order_by(BriefIndex.indexed_at.desc())
        result = await self.session.execute(stmt)
        rows = result.scalars().all()
        return [self._to_domain(row) for row in rows]

    async def save(self, brief: Brief) -> Brief:
        existing = await self.get_by_path(brief.folder_path)
        if existing:
            db_model = await self.session.get(BriefIndex, existing.id)
            if db_model:
                self._update_model(db_model, brief)
                await self.session.merge(db_model)
        else:
            db_model = self._to_model(brief)
            self.session.add(db_model)

        await self.session.commit()
        return brief

    async def delete(self, id: str) -> None:
        result = await self.session.get(BriefIndex, id)
        if result:
            await self.session.delete(result)
            await self.session.commit()

    async def get_by_path(self, path: str) -> Brief | None:
        stmt = select(BriefIndex).where(BriefIndex.folder_path == path)
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            return self._to_domain(row)
        return None

    async def get_children(self, parent_path: str) -> list[Brief]:
        prefix = f"{parent_path}/"
        stmt = select(BriefIndex).where(BriefIndex.folder_path.startswith(prefix))
        result = await self.session.execute(stmt)
        rows = result.scalars().all()
        return [self._to_domain(row) for row in rows]

    async def search(self, query: str) -> list[Brief]:
        search_term = f"%{query}%"
        stmt = select(BriefIndex).where(
            (BriefIndex.title.contains(search_term))
            | (BriefIndex.folder_path.contains(search_term))
            | (BriefIndex.user_tags.contains([query]))
        )
        result = await self.session.execute(stmt)
        rows = result.scalars().all()
        return [self._to_domain(row) for row in rows]

    async def rebuild_index(self, briefs: list[Brief]) -> None:
        await self.session.execute(delete(BriefIndex))
        for brief in briefs:
            db_model = self._to_model(brief)
            self.session.add(db_model)
        await self.session.commit()

    async def update_from_filesystem(self, path: str) -> None:
        pass

    async def delete_from_filesystem(self, path: str) -> None:
        stmt = select(BriefIndex).where(BriefIndex.folder_path == path)
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            await self.session.delete(row)
            await self.session.commit()

    def _to_domain(self, model: BriefIndex) -> Brief:
        decisions = []
        return Brief(
            id=model.id,
            folder_path=model.folder_path,
            title=model.title or "",
            status=Status(model.status) if model.status else Status.drafting,
            current_step=model.current_step,
            total_steps=model.total_steps,
            assigned_tool=model.assigned_tool,
            sprint_name=model.sprint_name,
            folder_name=model.folder_name,
            parent_task_path=model.parent_task_path,
            goal="",
            technical_details="",
            constraints=[],
            decisions=decisions,
            tags=model.user_tags or [],
            extracted_tags=model.extracted_tags or [],
            jira_key=model.jira_key,
            checklist_total=model.checklist_total,
            checklist_done=model.checklist_done,
            created_at=model.indexed_at or datetime.now(timezone.utc),
            last_active_at=model.last_active_at,
            indexed_at=model.indexed_at,
        )

    def _to_model(self, brief: Brief) -> BriefIndex:
        return BriefIndex(
            id=brief.id,
            folder_path=brief.folder_path,
            title=brief.title,
            status=brief.status.value if isinstance(brief.status, Status) else brief.status,
            current_step=brief.current_step,
            total_steps=brief.total_steps,
            assigned_tool=brief.assigned_tool,
            sprint_name=brief.sprint_name,
            folder_name=brief.folder_name,
            parent_task_path=brief.parent_task_path,
            user_tags=brief.tags,
            extracted_tags=brief.extracted_tags,
            jira_key=brief.jira_key,
            checklist_total=brief.checklist_total,
            checklist_done=brief.checklist_done,
            last_active_at=brief.last_active_at,
            indexed_at=brief.indexed_at or datetime.now(timezone.utc),
        )

    def _update_model(self, model: BriefIndex, brief: Brief) -> None:
        model.title = brief.title
        model.status = brief.status.value if isinstance(brief.status, Status) else brief.status
        model.current_step = brief.current_step
        model.total_steps = brief.total_steps
        model.assigned_tool = brief.assigned_tool
        model.sprint_name = brief.sprint_name
        model.folder_name = brief.folder_name
        model.parent_task_path = brief.parent_task_path
        model.user_tags = brief.tags
        model.extracted_tags = brief.extracted_tags
        model.jira_key = brief.jira_key
        model.checklist_total = brief.checklist_total
        model.checklist_done = brief.checklist_done
        model.last_active_at = brief.last_active_at
        model.indexed_at = datetime.now(timezone.utc)
