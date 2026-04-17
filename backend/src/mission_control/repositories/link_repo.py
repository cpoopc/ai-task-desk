from typing import Optional
from datetime import datetime, timezone
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from mission_control.domain.models import CrossTaskLink
from mission_control.domain.enums import LinkType
from mission_control.db.models import CrossTaskLinkDB
from mission_control.repositories.base import LinkRepository


class LinkRepoAsyncSQLite(LinkRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find_links(self, source_path: str) -> list[CrossTaskLink]:
        stmt = select(CrossTaskLinkDB).where(
            (CrossTaskLinkDB.source_path == source_path)
            | (CrossTaskLinkDB.target_path == source_path)
        )
        result = await self.session.execute(stmt)
        rows = result.scalars().all()
        return [self._to_domain(row) for row in rows]

    async def create_link(self, link: CrossTaskLink) -> CrossTaskLink:
        db_model = CrossTaskLinkDB(
            id=link.id,
            source_path=link.source_path,
            target_path=link.target_path,
            link_type=link.link_type.value
            if isinstance(link.link_type, LinkType)
            else link.link_type,
            match_method=link.match_method,
            score=link.score,
            matched_tags=link.matched_tags,
            created_at=link.created_at,
            confirmed_at=link.confirmed_at,
        )
        self.session.add(db_model)
        await self.session.commit()
        return link

    async def confirm_link(self, id: str) -> CrossTaskLink:
        result = await self.session.get(CrossTaskLinkDB, id)
        if result:
            result.link_type = LinkType.confirmed.value
            result.confirmed_at = datetime.now(timezone.utc)
            await self.session.commit()
            return self._to_domain(result)
        raise ValueError(f"Link {id} not found")

    async def dismiss_link(self, id: str) -> None:
        result = await self.session.get(CrossTaskLinkDB, id)
        if result:
            await self.session.delete(result)
            await self.session.commit()

    async def get_all_links(self) -> list[CrossTaskLink]:
        stmt = select(CrossTaskLinkDB).order_by(CrossTaskLinkDB.score.desc())
        result = await self.session.execute(stmt)
        rows = result.scalars().all()
        return [self._to_domain(row) for row in rows]

    async def clear_all(self) -> None:
        await self.session.execute(select(CrossTaskLinkDB))
        result = await self.session.execute(select(CrossTaskLinkDB))
        rows = result.scalars().all()
        for row in rows:
            await self.session.delete(row)
        await self.session.commit()

    def _to_domain(self, model: CrossTaskLinkDB) -> CrossTaskLink:
        return CrossTaskLink(
            id=model.id,
            source_path=model.source_path,
            target_path=model.target_path,
            link_type=LinkType(model.link_type) if model.link_type else LinkType.suggested,
            match_method=model.match_method or "rule",
            score=model.score,
            matched_tags=model.matched_tags or [],
            created_at=model.created_at,
            confirmed_at=model.confirmed_at,
        )
