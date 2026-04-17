from pathlib import Path
from dataclasses import dataclass, field
from typing import Literal, Optional
import yaml
import re
from datetime import datetime


@dataclass
class ChecklistItem:
    text: str
    status: Literal["todo", "done"] = "todo"
    metadata: dict | None = None


@dataclass
class ChecklistContent:
    items: list[ChecklistItem]


@dataclass
class BriefContent:
    title: str
    goal: str
    technical_details: str
    constraints: list[str]


@dataclass
class DecisionsContent:
    decisions: list[str]


@dataclass
class MetaContent:
    status: str = "drafting"
    current_step: int = 0
    total_steps: int = 0
    assigned_tool: str | None = None
    template_type: str | None = None
    jira_key: str | None = None
    tags: list[str] | None = None
    last_activity: str | None = None
    created_at: str | None = None
    last_active_at: str | None = None
    people: list[dict] | None = None
    links: list[dict] | None = None
    relations: list[dict] | None = None


@dataclass
class TaskFolder:
    path: Path
    brief: Optional[BriefContent] = None
    checklist: Optional[ChecklistContent] = None
    decisions: Optional[DecisionsContent] = None
    meta: Optional[MetaContent] = None
    subtasks: list["TaskFolder"] = field(default_factory=list)


class FileSystemAdapter:
    TASK_FILE_NAMES = ["brief.md", "checklist.md", "decisions.md", ".meta.yaml"]
    SKIP_PATTERNS = ["_resources", "_templates", ".hidden", "__pycache__", ".git"]

    def __init__(self, root_path: Path | None = None):
        self.root_path = root_path or Path(".mc")

    def walk_tasks(self, root: Path | None = None) -> list[TaskFolder]:
        root = root or self.root_path
        tasks = []
        for item in sorted(root.iterdir()):
            if item.name in self.SKIP_PATTERNS:
                continue
            if item.is_dir():
                task = self.parse_task(item)
                if task:
                    tasks.append(task)
        return tasks

    def parse_task(self, path: Path) -> TaskFolder | None:
        if not path.is_dir():
            return None
        brief_path = path / "brief.md"
        if not brief_path.exists():
            return None

        task = TaskFolder(path=path)

        if (path / "brief.md").exists():
            task.brief = self._parse_brief(path / "brief.md")
        if (path / "checklist.md").exists():
            task.checklist = self._parse_checklist(path / "checklist.md")
        if (path / "decisions.md").exists():
            task.decisions = self._parse_decisions(path / "decisions.md")
        if (path / ".meta.yaml").exists():
            task.meta = self._parse_meta(path / ".meta.yaml")

        for subdir in sorted(path.iterdir()):
            if subdir.is_dir() and subdir.name not in self.SKIP_PATTERNS:
                subtask = self.parse_task(subdir)
                if subtask:
                    task.subtasks.append(subtask)

        return task

    def _parse_brief(self, path: Path) -> BriefContent:
        content = path.read_text()
        title = ""
        goal = ""
        technical_details = ""
        constraints: list[str] = []

        title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if title_match:
            title = title_match.group(1).strip()

        goal_match = re.search(r"##\s+Goal\s*\n(.+?)(?=##|\Z)", content, re.DOTALL | re.IGNORECASE)
        if goal_match:
            goal = goal_match.group(1).strip()

        tech_match = re.search(
            r"##\s+Technical Details\s*\n(.+?)(?=##|\Z)", content, re.DOTALL | re.IGNORECASE
        )
        if tech_match:
            technical_details = tech_match.group(1).strip()

        constraints_match = re.search(
            r"##\s+Constraints\s*\n((?:- .+\n?)+)", content, re.MULTILINE | re.IGNORECASE
        )
        if constraints_match:
            constraints = [
                c.strip()[2:].strip()
                for c in constraints_match.group(1).split("\n")
                if c.strip().startswith("- ")
            ]

        return BriefContent(
            title=title,
            goal=goal,
            technical_details=technical_details,
            constraints=constraints,
        )

    def _parse_checklist(self, path: Path) -> ChecklistContent:
        content = path.read_text()
        items: list[ChecklistItem] = []

        for line in content.split("\n"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if (
                line.startswith("- [ ]")
                or line.startswith("- [x]")
                or line.startswith("* [ ]")
                or line.startswith("* [x]")
            ):
                done = "[x]" in line.lower()
                text = re.sub(r"^[\-\*]\s*\[[x ]\]\s*", "", line, flags=re.IGNORECASE)
                metadata = self._parse_checklist_metadata(line)
                items.append(
                    ChecklistItem(text=text, status="done" if done else "todo", metadata=metadata)
                )

        return ChecklistContent(items=items)

    def _parse_checklist_metadata(self, line: str) -> dict | None:
        html_comment_match = re.search(r"<!--(.+?)-->", line)
        if html_comment_match:
            try:
                return yaml.safe_load(html_comment_match.group(1))
            except yaml.YAMLError:
                return None
        return None

    def _parse_decisions(self, path: Path) -> DecisionsContent:
        content = path.read_text()
        decisions = []

        for line in content.split("\n"):
            line = line.strip()
            if line.startswith("- ") or line.startswith("* "):
                decision = line[2:].strip()
                decisions.append(decision)

        return DecisionsContent(decisions=decisions)

    def _parse_meta(self, path: Path) -> MetaContent:
        try:
            data = yaml.safe_load(path.read_text()) or {}
        except yaml.YAMLError:
            data = {}

        return MetaContent(
            status=data.get("status", "drafting"),
            current_step=data.get("currentStep", 0) or 0,
            total_steps=data.get("totalSteps", 0) or 0,
            assigned_tool=data.get("assignedTool"),
            template_type=data.get("templateType"),
            jira_key=data.get("jiraKey"),
            tags=data.get("tags"),
            last_activity=data.get("lastActivity"),
            created_at=data.get("createdAt"),
            last_active_at=data.get("lastActiveAt"),
            people=data.get("people"),
            links=data.get("links"),
            relations=data.get("relations"),
        )

    async def create_task_folder(
        self,
        path: Path,
        template_type: str = "default",
        title: str = "New Task",
    ) -> TaskFolder:
        path.mkdir(parents=True, exist_ok=True)

        brief_content = f"# {title}\n\n## Goal\n\n\n## Technical Details\n\n\n## Constraints\n\n"

        template_types = {"api_dependency", "endpoint", "schema_change", "bug_fix", "refactor"}
        if template_type in template_types:
            template_checklist_path = (
                Path(__file__).parent / "_templates" / template_type / "checklist.md"
            )
            if template_checklist_path.exists():
                checklist_content = template_checklist_path.read_text()
            else:
                checklist_content = """# Checklist

- [ ] Task item 1
- [ ] Task item 2

"""
        else:
            checklist_content = """# Checklist

- [ ] Task item 1
- [ ] Task item 2

"""

        decisions_content = """# Decisions

"""

        meta_content = {
            "status": "drafting",
            "currentStep": 0,
            "totalSteps": 0,
            "templateType": template_type,
        }

        (path / "brief.md").write_text(brief_content)
        (path / "checklist.md").write_text(checklist_content)
        (path / "decisions.md").write_text(decisions_content)
        (path / ".meta.yaml").write_text(yaml.dump(meta_content))

        return self.parse_task(path)

    def update_meta(self, path: Path, meta: MetaContent) -> None:
        meta_path = path / ".meta.yaml"
        data = {
            "status": meta.status,
            "currentStep": meta.current_step,
            "totalSteps": meta.total_steps,
            "assignedTool": meta.assigned_tool,
            "templateType": meta.template_type,
            "jiraKey": meta.jira_key,
            "tags": meta.tags,
            "lastActivity": meta.last_activity,
            "createdAt": meta.created_at,
            "lastActiveAt": meta.last_active_at,
            "people": meta.people,
            "links": meta.links,
            "relations": meta.relations,
        }
        meta_path.write_text(yaml.dump(data))

    def update_checklist(self, path: Path, checklist: ChecklistContent) -> None:
        lines = ["# Checklist", ""]
        for item in checklist.items:
            checkbox = "[x]" if item.status == "done" else "[ ]"
            line = f"- {checkbox} {item.text}"
            if item.metadata:
                line += f" <!--{yaml.dump(item.metadata)}-->"
            lines.append(line)

        (path / "checklist.md").write_text("\n".join(lines))

    def task_exists(self, path: Path) -> bool:
        return path.is_dir() and (path / "brief.md").exists()
