from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
import uuid
from datetime import datetime

from mission_control.domain.models import ReviewItem
from mission_control.domain.enums import ReviewStatus
from mission_control.repositories.review_repo import ReviewRepoAsyncSQLite
from mission_control.api.deps import get_review_service
from mission_control.api.schemas import ReviewCreate, FeedbackCreate, ReviewResponse

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("", response_model=list[ReviewResponse])
async def list_reviews(
    status: Optional[str] = None,
    service: ReviewRepoAsyncSQLite = Depends(get_review_service),
):
    reviews = await service.list(status)
    return [
        ReviewResponse(
            id=r.id,
            brief_path=r.brief_path,
            agent_tool=r.agent_tool,
            status=r.status.value if hasattr(r.status, "value") else r.status,
            diff_summary=r.diff_summary,
            files_changed=[f.model_dump() for f in r.files_changed],
            intent_checks=[i.model_dump() for i in r.intent_checks],
            submitted_at=r.submitted_at,
            reviewed_at=r.reviewed_at,
        )
        for r in reviews
    ]


@router.post("", response_model=ReviewResponse)
async def create_review(
    data: ReviewCreate,
    service: ReviewRepoAsyncSQLite = Depends(get_review_service),
):
    from mission_control.domain.models import FileChange, IntentCheck

    review = ReviewItem(
        id=str(uuid.uuid4()),
        brief_path=data.brief_path,
        agent_tool=data.agent_tool,
        status=ReviewStatus.pending,
        diff_summary=data.diff_summary,
        files_changed=[FileChange(**f) for f in data.files_changed],
        intent_checks=[IntentCheck(**i) for i in data.intent_checks],
        submitted_at=datetime.utcnow(),
    )

    created = await service.create(review)
    return ReviewResponse(
        id=created.id,
        brief_path=created.brief_path,
        agent_tool=created.agent_tool,
        status=created.status.value if hasattr(created.status, "value") else created.status,
        diff_summary=created.diff_summary,
        files_changed=[f.model_dump() for f in created.files_changed],
        intent_checks=[i.model_dump() for i in created.intent_checks],
        submitted_at=created.submitted_at,
        reviewed_at=created.reviewed_at,
    )


@router.get("/{id}", response_model=ReviewResponse)
async def get_review(
    id: str,
    service: ReviewRepoAsyncSQLite = Depends(get_review_service),
):
    review = await service.get(id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return ReviewResponse(
        id=review.id,
        brief_path=review.brief_path,
        agent_tool=review.agent_tool,
        status=review.status.value if hasattr(review.status, "value") else review.status,
        diff_summary=review.diff_summary,
        files_changed=[f.model_dump() for f in review.files_changed],
        intent_checks=[i.model_dump() for i in review.intent_checks],
        submitted_at=review.submitted_at,
        reviewed_at=review.reviewed_at,
    )


@router.put("/{id}/feedback", response_model=ReviewResponse)
async def submit_feedback(
    id: str,
    feedback: FeedbackCreate,
    service: ReviewRepoAsyncSQLite = Depends(get_review_service),
):
    updated = await service.update_feedback(id, feedback.model_dump())
    return ReviewResponse(
        id=updated.id,
        brief_path=updated.brief_path,
        agent_tool=updated.agent_tool,
        status=updated.status.value if hasattr(updated.status, "value") else updated.status,
        diff_summary=updated.diff_summary,
        files_changed=[f.model_dump() for f in updated.files_changed],
        intent_checks=[i.model_dump() for i in updated.intent_checks],
        submitted_at=updated.submitted_at,
        reviewed_at=updated.reviewed_at,
    )


@router.delete("/{id}")
async def delete_review(
    id: str,
    service: ReviewRepoAsyncSQLite = Depends(get_review_service),
):
    await service.delete(id)
    return {"status": "deleted"}
