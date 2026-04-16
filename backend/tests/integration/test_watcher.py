import pytest
import asyncio
from pathlib import Path
from mission_control.adapters.watcher import FileWatcher, TaskFileWatcher


class TestFileWatcher:
    def test_file_watcher_initialization(self, tmp_path):
        watcher = FileWatcher(root_path=tmp_path)
        assert watcher.root_path == tmp_path
        assert watcher.poll_interval == 1.0

    def test_file_watcher_stop(self, tmp_path):
        watcher = FileWatcher(root_path=tmp_path)
        watcher.stop()
        assert watcher._stop_event.is_set()


class TestTaskFileWatcher:
    def test_is_task_file(self, tmp_path):
        watcher = TaskFileWatcher(root_path=tmp_path)
        assert watcher._is_task_file(Path("brief.md")) is True
        assert watcher._is_task_file(Path("checklist.md")) is True
        assert watcher._is_task_file(Path("decisions.md")) is True
        assert watcher._is_task_file(Path(".meta.yaml")) is True
        assert watcher._is_task_file(Path("app.py")) is False
        assert watcher._is_task_file(Path("data.yaml")) is True
        assert watcher._is_task_file(Path("data.yml")) is True

    def test_extract_task_path_with_brief(self, tmp_path):
        watcher = TaskFileWatcher(root_path=tmp_path)

        task_dir = tmp_path / "Sprint 1" / "Task 1"
        task_dir.mkdir(parents=True)
        (task_dir / "brief.md").touch()

        path = task_dir / "brief.md"
        result = watcher._extract_task_path(path)
        assert result == task_dir

    def test_extract_task_path_deep_nested(self, tmp_path):
        watcher = TaskFileWatcher(root_path=tmp_path)

        task_dir = tmp_path / "Sprint 1" / "Backend" / "Task 1"
        task_dir.mkdir(parents=True)
        (task_dir / "brief.md").touch()

        path = task_dir / "checklist.md"
        result = watcher._extract_task_path(path)
        assert result == task_dir

    @pytest.mark.asyncio
    async def test_watcher_callback(self, tmp_path):
        callback_results = []

        async def callback(change_type, path):
            callback_results.append((change_type, path))

        watcher = TaskFileWatcher(root_path=tmp_path, on_change=callback)
        watcher._stop_event.set()

        await watcher._safe_call(callback, "test_change", Path("test.txt"))
        assert len(callback_results) == 1

    @pytest.mark.asyncio
    async def test_watcher_async_callback(self, tmp_path):
        callback_results = []

        async def async_callback(change_type, path):
            callback_results.append((change_type, path))

        watcher = TaskFileWatcher(root_path=tmp_path, on_change=async_callback)
        watcher._stop_event.set()

        await watcher._safe_call(async_callback, "async_change", Path("test.txt"))
        assert len(callback_results) == 1
        assert callback_results[0][0] == "async_change"

    def test_watcher_stop(self, tmp_path):
        watcher = TaskFileWatcher(root_path=tmp_path)
        watcher.stop()
        assert watcher._stop_event.is_set()
