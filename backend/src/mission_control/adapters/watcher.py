import asyncio
from pathlib import Path
from typing import Callable, Optional
from watchfiles import awatch, Change
from datetime import datetime


class FileWatcher:
    def __init__(
        self,
        root_path: Path,
        on_change: Callable | None = None,
        poll_interval: float = 1.0,
    ):
        self.root_path = root_path
        self.on_change = on_change
        self.poll_interval = poll_interval
        self._stop_event = asyncio.Event()
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        self._stop_event.clear()
        ignore_patterns = ["__pycache__", ".git", ".cache", "node_modules", ".mc/.cache"]

        async for changes in awatch(
            self.root_path,
            stop_event=self._stop_event,
            poll_interval=self.poll_interval,
        ):
            for change_type, path_str in changes:
                path = Path(path_str)

                if any(pattern in str(path) for pattern in ignore_patterns):
                    continue

                await self._handle_change(change_type, path)

    async def _handle_change(self, change_type: Change, path: Path) -> None:
        if self.on_change:
            await self._safe_call(self.on_change, change_type, path)

    async def _safe_call(self, func: Callable, *args) -> None:
        try:
            if asyncio.iscoroutinefunction(func):
                await func(*args)
            else:
                func(*args)
        except Exception as e:
            print(f"Error in watcher callback: {e}")

    def stop(self) -> None:
        self._stop_event.set()

    async def wait(self) -> None:
        await self._stop_event.wait()


class TaskFileWatcher(FileWatcher):
    TASK_FILES = {"brief.md", "checklist.md", "decisions.md", ".meta.yaml"}

    def _is_task_file(self, path: Path) -> bool:
        return path.name in self.TASK_FILES or path.suffix in {".md", ".yaml", ".yml"}

    def _extract_task_path(self, path: Path) -> Path:
        current = path
        while current != current.parent and current != self.root_path:
            if (current / "brief.md").exists():
                return current
            current = current.parent
        return path.parent

    async def _handle_change(self, change_type: Change, path: Path) -> None:
        if not self._is_task_file(path):
            return

        task_path = self._extract_task_path(path)

        if self.on_change:
            await self._safe_call(self.on_change, change_type, task_path)
