import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from mission_control.domain.models import Brief, BriefFilters
from mission_control.domain.enums import Status
from mission_control.repositories.brief_repo import BriefRepoAsyncSQLite


@pytest.mark.asyncio
class TestBriefRepository:
    async def test_save_and_get(self, db_session: AsyncSession, sample_brief_data: dict):
        repo = BriefRepoAsyncSQLite(db_session)

        brief = Brief(**sample_brief_data)
        saved = await repo.save(brief)
        assert saved.id == sample_brief_data["id"]

        fetched = await repo.get(saved.id)
        assert fetched is not None
        assert fetched.id == sample_brief_data["id"]
        assert fetched.title == sample_brief_data["title"]
        assert fetched.folder_path == sample_brief_data["folder_path"]

    async def test_get_by_path(self, db_session: AsyncSession, sample_brief_data: dict):
        repo = BriefRepoAsyncSQLite(db_session)

        brief = Brief(**sample_brief_data)
        await repo.save(brief)

        fetched = await repo.get_by_path(sample_brief_data["folder_path"])
        assert fetched is not None
        assert fetched.id == sample_brief_data["id"]

    async def test_get_by_path_not_found(self, db_session: AsyncSession):
        repo = BriefRepoAsyncSQLite(db_session)

        fetched = await repo.get_by_path("nonexistent/path")
        assert fetched is None

    async def test_list_empty(self, db_session: AsyncSession):
        repo = BriefRepoAsyncSQLite(db_session)

        briefs = await repo.list(None)
        assert briefs == []

    async def test_list_with_briefs(self, db_session: AsyncSession, sample_brief_data: dict):
        repo = BriefRepoAsyncSQLite(db_session)

        brief = Brief(**sample_brief_data)
        await repo.save(brief)

        briefs = await repo.list(None)
        assert len(briefs) == 1
        assert briefs[0].id == sample_brief_data["id"]

    async def test_list_filter_by_sprint(self, db_session: AsyncSession):
        repo = BriefRepoAsyncSQLite(db_session)

        brief1 = Brief(
            id="1", folder_path="Sprint 1/Task 1", title="Task 1", sprint_name="Sprint 1"
        )
        brief2 = Brief(
            id="2", folder_path="Sprint 2/Task 1", title="Task 2", sprint_name="Sprint 2"
        )
        await repo.save(brief1)
        await repo.save(brief2)

        filters = BriefFilters(sprint="Sprint 1")
        briefs = await repo.list(filters)
        assert len(briefs) == 1
        assert briefs[0].sprint_name == "Sprint 1"

    async def test_list_filter_by_status(self, db_session: AsyncSession):
        repo = BriefRepoAsyncSQLite(db_session)

        brief1 = Brief(
            id="1", folder_path="Sprint 1/Task 1", title="Task 1", status=Status.drafting
        )
        brief2 = Brief(
            id="2", folder_path="Sprint 1/Task 2", title="Task 2", status=Status.in_progress
        )
        await repo.save(brief1)
        await repo.save(brief2)

        filters = BriefFilters(status="in_progress")
        briefs = await repo.list(filters)
        assert len(briefs) == 1
        assert briefs[0].status == Status.in_progress

    async def test_search(self, db_session: AsyncSession):
        repo = BriefRepoAsyncSQLite(db_session)

        brief1 = Brief(id="1", folder_path="Sprint 1/Task 1", title="Redis Cache")
        brief2 = Brief(id="2", folder_path="Sprint 1/Task 2", title="PostgreSQL DB")
        await repo.save(brief1)
        await repo.save(brief2)

        results = await repo.search("redis")
        assert len(results) == 1
        assert results[0].title == "Redis Cache"

    async def test_delete(self, db_session: AsyncSession, sample_brief_data: dict):
        repo = BriefRepoAsyncSQLite(db_session)

        brief = Brief(**sample_brief_data)
        await repo.save(brief)

        await repo.delete(brief.id)

        fetched = await repo.get(brief.id)
        assert fetched is None

    async def test_delete_from_filesystem(self, db_session: AsyncSession, sample_brief_data: dict):
        repo = BriefRepoAsyncSQLite(db_session)

        brief = Brief(**sample_brief_data)
        await repo.save(brief)

        await repo.delete_from_filesystem(sample_brief_data["folder_path"])

        fetched = await repo.get_by_path(sample_brief_data["folder_path"])
        assert fetched is None

    async def test_update_existing_brief(self, db_session: AsyncSession, sample_brief_data: dict):
        repo = BriefRepoAsyncSQLite(db_session)

        brief = Brief(**sample_brief_data)
        await repo.save(brief)

        brief.title = "Updated Title"
        brief.status = Status.in_progress
        await repo.save(brief)

        fetched = await repo.get(brief.id)
        assert fetched.title == "Updated Title"
        assert fetched.status == Status.in_progress

    async def test_rebuild_index(self, db_session: AsyncSession):
        repo = BriefRepoAsyncSQLite(db_session)

        brief1 = Brief(id="1", folder_path="Sprint 1/Task 1", title="Task 1")
        brief2 = Brief(id="2", folder_path="Sprint 1/Task 2", title="Task 2")
        await repo.save(brief1)
        await repo.save(brief2)

        new_briefs = [Brief(id="3", folder_path="Sprint 2/Task 1", title="Task 3")]

        await repo.rebuild_index(new_briefs)

        all_briefs = await repo.list(None)
        assert len(all_briefs) == 1
        assert all_briefs[0].id == "3"
