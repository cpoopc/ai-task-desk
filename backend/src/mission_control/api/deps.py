from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from mission_control.db.session import get_session
from mission_control.db.models import TimelineEventDB
from mission_control.repositories.brief_repo import BriefRepoAsyncSQLite
from mission_control.repositories.review_repo import ReviewRepoAsyncSQLite
from mission_control.repositories.link_repo import LinkRepoAsyncSQLite
from mission_control.repositories.base import TimelineRepository, NotificationRepository
from mission_control.services.brief_service import BriefService
from mission_control.services.folder_service import FolderService
from mission_control.services.sprint_service import SprintService
from mission_control.services.plan_service import PlanService
from mission_control.adapters.filesystem import FileSystemAdapter
from mission_control.adapters.exporter import JinjaContextExporter
from mission_control.config import get_settings


async def get_db_session():
    async for session in get_session():
        yield session


def get_filesystem() -> FileSystemAdapter:
    settings = get_settings()
    return FileSystemAdapter(root_path=settings.mc_root)


def get_exporter() -> JinjaContextExporter:
    return JinjaContextExporter()


def get_brief_service(
    session: AsyncSession = Depends(get_db_session),
    fs: FileSystemAdapter = Depends(get_filesystem),
) -> BriefService:
    repo = BriefRepoAsyncSQLite(session)
    return BriefService(repo, fs)


def get_folder_service(
    fs: FileSystemAdapter = Depends(get_filesystem),
) -> FolderService:
    return FolderService(fs)


def get_sprint_service() -> SprintService:
    return SprintService()


def get_plan_service() -> PlanService:
    return PlanService()


def get_review_service(
    session: AsyncSession = Depends(get_db_session),
) -> ReviewRepoAsyncSQLite:
    return ReviewRepoAsyncSQLite(session)


def get_link_repository(
    session: AsyncSession = Depends(get_db_session),
) -> LinkRepoAsyncSQLite:
    return LinkRepoAsyncSQLite(session)
