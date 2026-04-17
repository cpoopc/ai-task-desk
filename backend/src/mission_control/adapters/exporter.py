from __future__ import annotations
from pathlib import Path
from jinja2 import Template
from typing import Protocol
from mission_control.domain.models import Brief


class ContextExporter(Protocol):
    def export_cursorrules(self, brief: Brief) -> str: ...
    def export_claude_md(self, brief: Brief) -> str: ...
    def export_agents_md(self, brief: Brief) -> str: ...


CURSOR_RULES_TEMPLATE = """# Cursor Rules for {{ title }}

## Project Overview
{{ goal }}

{% if technical_details %}
## Technical Details
{{ technical_details }}
{% endif %}

{% if constraints %}
## Constraints
{% for constraint in constraints %}
- {{ constraint }}
{% endfor %}
{% endif %}

{% if checklist_total > 0 %}
## Progress
- [ ] {{ checklist_done }}/{{ checklist_total }} completed
{% endif %}

{% if assigned_tool %}
## Assigned Tool
{{ assigned_tool }}
{% endif %}

{% if tags %}
## Tags
{% for tag in tags %}
- {{ tag }}
{% endfor %}
{% endif %}
"""

CLAUDE_MD_TEMPLATE = """# {{ title }}

{% if goal %}
## Goal
{{ goal }}
{% endif %}

{% if technical_details %}
## Technical Details
{{ technical_details }}
{% endif %}

{% if constraints %}
## Constraints
{% for constraint in constraints %}
- {{ constraint }}
{% endfor %}
{% endif %}

{% if decisions %}
## Decisions
{% for decision in decisions %}
- {{ decision.text }}
{% endfor %}
{% endif %}

---
*Task: {{ folder_path }}*
{% if jira_key %}
*Jira: {{ jira_key }}*
{% endif %}
"""

AGENTS_MD_TEMPLATE = """# Agent Stack

## Current Task
{{ title }}

{% if goal %}
## Goal
{{ goal }}
{% endif %}

## Context Files
- brief.md (this file)
- checklist.md
- decisions.md
{% if folder_path %}
- Path: {{ folder_path }}
{% endif %}
"""


class JinjaContextExporter:
    def __init__(self):
        self.cursorrules_template = Template(CURSOR_RULES_TEMPLATE)
        self.claude_md_template = Template(CLAUDE_MD_TEMPLATE)
        self.agents_md_template = Template(AGENTS_MD_TEMPLATE)

    def export_cursorrules(self, brief: Brief) -> str:
        return self.cursorrules_template.render(
            title=brief.title,
            goal=brief.goal,
            technical_details=brief.technical_details,
            constraints=brief.constraints,
            checklist_total=brief.checklist_total,
            checklist_done=brief.checklist_done,
            assigned_tool=brief.assigned_tool,
            tags=brief.tags,
        )

    def export_claude_md(self, brief: Brief) -> str:
        return self.claude_md_template.render(
            title=brief.title,
            folder_path=brief.folder_path,
            goal=brief.goal,
            technical_details=brief.technical_details,
            constraints=brief.constraints,
            decisions=brief.decisions,
            jira_key=brief.jira_key,
        )

    def export_agents_md(self, brief: Brief) -> str:
        return self.agents_md_template.render(
            title=brief.title,
            goal=brief.goal,
            folder_path=brief.folder_path,
        )

    def export_all(self, brief: Brief, output_dir: Path) -> dict[str, Path]:
        files = {}

        cursorrules = self.export_cursorrules(brief)
        cursorrules_path = output_dir / ".cursorrules"
        cursorrules_path.write_text(cursorrules)
        files[".cursorrules"] = cursorrules_path

        claude_md = self.export_claude_md(brief)
        claude_md_path = output_dir / "CLAUDE.md"
        claude_md_path.write_text(claude_md)
        files["CLAUDE.md"] = claude_md_path

        agents_md = self.export_agents_md(brief)
        agents_md_path = output_dir / "AGENTS.md"
        agents_md_path.write_text(agents_md)
        files["AGENTS.md"] = agents_md_path

        return files

    def export_content(self, brief: Brief) -> dict[str, str]:
        return {
            ".cursorrules": self.export_cursorrules(brief),
            "CLAUDE.md": self.export_claude_md(brief),
            "AGENTS.md": self.export_agents_md(brief),
        }
