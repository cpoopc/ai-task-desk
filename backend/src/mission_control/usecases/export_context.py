from pathlib import Path
from mission_control.domain.models import Brief
from mission_control.adapters.exporter import JinjaContextExporter
from mission_control.repositories.brief_repo import BriefRepoAsyncSQLite


class ExportContextUseCase:
    def __init__(
        self,
        repository: BriefRepoAsyncSQLite,
        exporter: JinjaContextExporter,
    ):
        self.repository = repository
        self.exporter = exporter

    async def execute(self, brief_path: str, output_dir: Path | None = None) -> dict:
        brief = await self.repository.get_by_path(brief_path)
        if not brief:
            raise ValueError(f"Brief not found: {brief_path}")

        if output_dir is None:
            output_dir = Path.cwd()

        files = self.exporter.export_all(brief, output_dir)

        return {
            "brief_path": brief_path,
            "exported_files": [str(f) for f in files.values()],
        }
