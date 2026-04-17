from typing import Optional
from datetime import datetime, timezone
from sqlmodel import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from mission_control.domain.models import ReviewItem, Feedback
from mission_control.domain.enums import ReviewStatus
from mission_control.db.models import ReviewItemDB
from mission_control.repositories.base import ReviewRepository


class ReviewRepoAsyncSQLite(ReviewRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, review: ReviewItem) -> ReviewItem:
        db_model = ReviewItemDB(
            id=review.id,
            brief_path=review.brief_path,
            agent_tool=review.agent_tool,
            status=review.status.value
            if isinstance(review.status, ReviewStatus)
            else review.status,
            diff_summary=review.diff_summary,
            files_changed=[f.model_dump() for f in review.files_changed],
            intent_checks=[i.model_dump() for i in review.intent_checks],
            feedback=review.feedback.model_dump() if review.feedback else None,
            submitted_at=review.submitted_at,
            reviewed_at=review.reviewed_at,
        )
        self.session.add(db_model)
        await self.session.commit()
        return review

    async def get(self, id: str) -> Optional[ReviewItem]:
        result = await self.session.get(ReviewItemDB, id)
        if result:
            return self._to_domain(result)
        return None

    async def list(self, status: str | None = None) -> list[ReviewItem]:
        stmt = select(ReviewItemDB)
        if status:
            stmt = stmt.where(ReviewItemDB.status == status)
        stmt = stmt.order_by(ReviewItemDB.submitted_at.desc())
        result = await self.session.execute(stmt)
        rows = result.scalars().all()
        return [self._to_domain(row) for row in rows]

    async def update_feedback(self, id: str, feedback: dict) -> ReviewItem:
        result = await self.session.get(ReviewItemDB, id)
        if result:
            result.feedback = feedback
            result.reviewed_at = datetime.now(timezone.utc)
            await self.session.commit()
            return self._to_domain(result)
        raise ValueError(f"Review {id} not found")

    async def delete(self, id: str) -> None:
        result = await self.session.get(ReviewItemDB, id)
        if result:
            await self.session.delete(result)
            await self.session.commit()

    def _to_domain(self, model: ReviewItemDB) -> ReviewItem:
        from mission_control.domain.models import FileChange, IntentCheck, Feedback

        files_changed = [FileChange(**f) for f in (model.files_changed or [])]
        intent_checks = [IntentCheck(**i) for i in (model.intent_checks or [])]
        feedback = Feedback(**model.feedback) if model.feedback else None

        return ReviewItem(
            id=model.id,
            brief_path=model.brief_path,
            agent_tool=model.agent_tool or "",
            status=ReviewStatus(model.status) if model.status else ReviewStatus.pending,
            diff_summary=model.diff_summary or "",
            files_changed=files_changed,
            intent_checks=intent_checks,
            feedback=feedback,
            submitted_at=model.submitted_at,
            reviewed_at=model.reviewed_at,
        )
