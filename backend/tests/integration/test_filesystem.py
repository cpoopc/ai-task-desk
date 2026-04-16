import pytest
from pathlib import Path
from mission_control.adapters.filesystem import (
    FileSystemAdapter,
    TaskFolder,
    BriefContent,
    ChecklistContent,
    ChecklistItem,
    MetaContent,
    DecisionsContent,
)


class TestFileSystemAdapter:
    def setup_method(self):
        self.fs = FileSystemAdapter(root_path=Path("/tmp/mc_test"))

    def test_walk_tasks_empty_dir(self, tmp_path):
        fs = FileSystemAdapter(root_path=tmp_path)
        tasks = fs.walk_tasks()
        assert tasks == []

    def test_parse_task_no_brief_md(self, tmp_path):
        task_dir = tmp_path / "task1"
        task_dir.mkdir()
        # No brief.md file
        result = self.fs.parse_task(task_dir)
        assert result is None

    def test_parse_task_with_brief_md(self, sample_task_files):
        result = self.fs.parse_task(sample_task_files)
        assert result is not None
        assert isinstance(result, TaskFolder)
        assert result.brief is not None
        assert result.brief.title == "Test Task"

    def test_parse_brief(self, sample_task_files):
        brief = self.fs._parse_brief(sample_task_files / "brief.md")
        assert isinstance(brief, BriefContent)
        assert brief.title == "Test Task"
        assert "test functionality" in brief.goal.lower()
        assert "pytest" in brief.technical_details.lower()

    def test_parse_checklist(self, sample_task_files):
        checklist = self.fs._parse_checklist(sample_task_files / "checklist.md")
        assert isinstance(checklist, ChecklistContent)
        assert len(checklist.items) == 3
        # Check item statuses
        assert checklist.items[0].status == "todo"
        assert checklist.items[1].status == "done"
        assert checklist.items[2].status == "todo"
        assert "Write tests" in checklist.items[0].text
        assert "Run tests" in checklist.items[1].text

    def test_parse_meta(self, sample_task_files):
        meta = self.fs._parse_meta(sample_task_files / ".meta.yaml")
        assert isinstance(meta, MetaContent)
        assert meta.status == "drafting"
        assert meta.current_step == 1
        assert meta.total_steps == 3
        assert meta.assigned_tool == "codex"
        assert meta.jira_key == "TEST-123"
        assert "backend" in meta.tags
        assert "api" in meta.tags

    def test_parse_decisions(self, sample_task_files):
        decisions = self.fs._parse_decisions(sample_task_files / "decisions.md")
        assert isinstance(decisions, DecisionsContent)
        assert len(decisions.decisions) == 2
        assert "pytest" in decisions.decisions[0].lower()

    def test_task_exists(self, sample_task_files):
        assert self.fs.task_exists(sample_task_files) is True
        assert self.fs.task_exists(Path("/nonexistent")) is False

    @pytest.mark.asyncio
    async def test_create_task_folder(self, tmp_path):
        fs = FileSystemAdapter(root_path=tmp_path)
        task_path = tmp_path / "new_task"
        task = await fs.create_task_folder(task_path, "default", "New Task")

        assert task_path.exists()
        assert (task_path / "brief.md").exists()
        assert (task_path / "checklist.md").exists()
        assert (task_path / "decisions.md").exists()
        assert (task_path / ".meta.yaml").exists()

        # Verify brief content
        brief = fs._parse_brief(task_path / "brief.md")
        assert brief.title == "New Task"

    def test_update_meta(self, sample_task_files):
        meta = MetaContent(
            status="in_progress",
            current_step=2,
            total_steps=5,
            assigned_tool="claude",
            jira_key="TEST-999",
        )
        self.fs.update_meta(sample_task_files, meta)

        # Read back
        updated = self.fs._parse_meta(sample_task_files / ".meta.yaml")
        assert updated.status == "in_progress"
        assert updated.current_step == 2
        assert updated.total_steps == 5
        assert updated.assigned_tool == "claude"
        assert updated.jira_key == "TEST-999"

    def test_update_checklist(self, sample_task_files):
        new_items = [
            ChecklistItem(text="New item 1", status="todo"),
            ChecklistItem(text="New item 2", status="done"),
            ChecklistItem(text="New item 3", status="todo"),
        ]
        checklist = ChecklistContent(items=new_items)
        self.fs.update_checklist(sample_task_files, checklist)

        # Read back
        updated = self.fs._parse_checklist(sample_task_files / "checklist.md")
        assert len(updated.items) == 3
        assert updated.items[0].text == "New item 1"
        assert updated.items[0].status == "todo"
        assert updated.items[1].status == "done"


class TestChecklistItem:
    def test_checklist_item_default(self):
        item = ChecklistItem(text="Test item")
        assert item.text == "Test item"
        assert item.status == "todo"
        assert item.metadata is None

    def test_checklist_item_with_metadata(self):
        metadata = {"priority": "high", "assigned": "john"}
        item = ChecklistItem(text="Test", status="done", metadata=metadata)
        assert item.metadata == metadata


class TestMetaContent:
    def test_meta_content_defaults(self):
        meta = MetaContent()
        assert meta.status == "drafting"
        assert meta.current_step == 0
        assert meta.total_steps == 0
        assert meta.assigned_tool is None
        assert meta.jira_key is None
        assert meta.tags is None

    def test_meta_content_full(self):
        meta = MetaContent(
            status="in_progress",
            current_step=2,
            total_steps=5,
            assigned_tool="cursor",
            template_type="feature",
            jira_key="TEST-123",
            tags=["backend", "api"],
            last_activity="Updated brief.md",
        )
        assert meta.status == "in_progress"
        assert meta.current_step == 2
        assert meta.total_steps == 5
        assert meta.assigned_tool == "cursor"
        assert meta.template_type == "feature"
        assert meta.jira_key == "TEST-123"
        assert meta.tags == ["backend", "api"]
