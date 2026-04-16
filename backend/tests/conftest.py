import pytest
import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlmodel import SQLModel, delete
from mission_control.db.models import (
    BriefIndex,
    ReviewItemDB,
    CrossTaskLinkDB,
    TimelineEventDB,
    NotificationDB,
)


@pytest.fixture(autouse=True)
async def clean_db():
    from mission_control.db.session import engine

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    async with AsyncSession(db_engine) as session:
        yield session


@pytest.fixture
def sample_brief_data():
    return {
        "id": "test-brief-1",
        "folder_path": "Sprint 1/Task 1",
        "title": "Test Brief",
        "status": "drafting",
        "current_step": 0,
        "total_steps": 3,
        "assigned_tool": "codex",
        "sprint_name": "Sprint 1",
        "folder_name": "Task 1",
        "user_tags": ["backend", "api"],
        "extracted_tags": ["fastapi"],
        "checklist_total": 5,
        "checklist_done": 2,
        "jira_key": "TEST-123",
    }


@pytest.fixture
def temp_task_dir(tmp_path):
    task_dir = tmp_path / "test_task"
    task_dir.mkdir()
    return task_dir


@pytest.fixture
def sample_task_files(temp_task_dir):
    brief_content = """# Test Task

## Goal
Implement test functionality

## Technical Details
Use pytest for testing

## Constraints
- Must pass CI
"""

    checklist_content = """# Checklist

- [ ] Write tests
- [x] Run tests
- [ ] Fix bugs
"""

    decisions_content = """# Decisions

- Use pytest framework
- Mock external services
"""

    meta_content = """status: drafting
currentStep: 1
totalSteps: 3
assignedTool: codex
templateType: default
tags:
  - backend
  - api
jiraKey: TEST-123
"""

    (temp_task_dir / "brief.md").write_text(brief_content)
    (temp_task_dir / "checklist.md").write_text(checklist_content)
    (temp_task_dir / "decisions.md").write_text(decisions_content)
    (temp_task_dir / ".meta.yaml").write_text(meta_content)

    return temp_task_dir
