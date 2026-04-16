from mission_control.adapters.filesystem import FileSystemAdapter
from mission_control.repositories.brief_repo import BriefRepoAsyncSQLite
from mission_control.services.brief_service import BriefService


class RebuildIndexUseCase:
    def __init__(
        self,
        repository: BriefRepoAsyncSQLite,
        filesystem: FileSystemAdapter,
        brief_service: BriefService,
    ):
        self.repository = repository
        self.fs = filesystem
        self.brief_service = brief_service

    async def execute(self) -> dict:
        tasks = self.fs.walk_tasks()
        briefs = []

        for task in tasks:
            brief = await self.brief_service._task_folder_to_brief(task)
            if brief:
                briefs.append(brief)

        await self.repository.rebuild_index(briefs)

        return {
            "total": len(briefs),
            "sprints": len(set(b.sprint_name for b in briefs if b.sprint_name)),
        }
