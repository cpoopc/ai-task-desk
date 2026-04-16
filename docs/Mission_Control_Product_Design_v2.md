# AI Dev Mission Control — Product Design Document

> Version 2.0 | April 2026
> A coordination layer that sits above AI coding tools to reduce cognitive overhead.

---

## 1. Problem statement

AI coding tools (Cursor, Claude Code, Codex, Kiro) have compressed production time but inflated coordination and cognitive overhead. Developers now act as managers of multiple AI agents, suffering from:

- **Iterative back-and-forth**: A typical feature requires 5-7 rounds of AI interaction. Most "supplements" (caching, feature flags, metrics, logging) are predictable but not captured upfront.
- **Cross-task context switching**: Developers manage 3-5 concurrent tasks across different AI workspaces, repos, and stages. Each switch requires dumping one mental context and loading another. AI tools have no memory across sessions.
- **Review fatigue**: Every AI output requires judgment calls — is this correct, does it match intent, what's missing. This is cognitively expensive and done across many contexts in rapid succession.

**Core insight**: The developer's bottleneck has shifted from code production to decision-making (architecture, error handling, tradeoffs). Mission Control protects decision-making energy by reducing unnecessary cognitive load.

---

## 2. Solution overview

Mission Control is a local-first coordination layer with five integrated modules:

| Module | Purpose | Key pain solved |
|--------|---------|-----------------|
| Task Brief System | Structured task specs with checklists + decision logs | Reduces AI iteration rounds from 5-7 to 2-3 |
| Review Queue | Batched async review of AI outputs with intent checking | Eliminates real-time AI babysitting |
| Context Sync | Cross-task dashboard, session restore, link detection | Eliminates "where was I?" context rebuild |
| Task Graph & Relationships | Visual dependency map, enriched task cards, workflow view | Provides global view, prevents blind spots |
| Dynamic Plan & Archive | Living daily plan, disruption handling, daily/sprint summaries | Keeps the plan alive as reality changes |

---

## 3. Module 1: Task brief system

### 3.1 What it does

Transforms the implicit knowledge in a developer's head into an explicit, structured document that both human and AI can reference. Provides type-aware checklist templates that prompt the developer to address predictable requirements upfront.

### 3.2 Brief structure

Each task brief consists of 4 files in a task folder:

**brief.md** — The main document:
- Goal: one-sentence task description
- Technical details: API specs, schemas, endpoint definitions (markdown)
- Error handling: table of scenario → behavior → rationale
- Feature flag: name, default value, rollout plan
- Metrics: name, type (histogram/counter/gauge), description
- Files affected: repo, path, action (new/modify/delete)
- Constraints: explicit "do NOT" rules
- References: links to _resources/ docs and external systems

**checklist.md** — Standard markdown checkboxes grouped by phase:
- Each item has text, hint (guidance), priority (must/should/nice)
- Resolved value captured when marking done (e.g., "Caffeine LRU, TTL 5min")
- Phases organize items by concern (Design, Auth, Implementation, Testing, Ops)
- Progress trackable by counting [x] vs [ ]

**decisions.md** — Append-only decision log:
- Each entry: question, answer, rationale, source, timestamp
- Records why decisions were made, not just what was decided
- Exported to AI tools so they understand reasoning, not just conclusions

**.meta.yaml** — Machine-readable metadata:
- Status, current step, total steps, assigned AI tool
- Jira key, user-defined tags
- People (owner, reviewer, stakeholder with contact info)
- External links (Jira, Confluence, test cases, PRs, Figma, Slack)
- Relations to other tasks (blocks, blocked-by, depends-on, related-to)
- Resource references (_resources/ paths)

### 3.3 Checklist templates

5 built-in templates, each with phased items:

| Template | Items | Phases |
|----------|-------|--------|
| New API dependency | 7 | Design, Observability |
| New microservice endpoint | 24 | API design (5), Auth & security (5), Implementation (5), Testing (4), Observability (5) |
| Database schema change | 5 | Migration, Validation |
| Bug fix | 5 | Analysis, Fix, Verification |
| Refactor / tech debt | 4 | Scope, Verification |

### 3.4 Three-layer checklist sources

1. **Base template (built-in)**: Industry-standard best practices. The starting point.
2. **Team layer (organizational)**: Team-specific conventions from accumulated code review feedback. Maintained in _templates/team/.
3. **Personal layer (learned)**: Items frequently missed by this developer float to top; items consistently skipped are collapsed. Accumulated from history.

Feedback loop: checklist → AI implementation → review finds gap → one-click add to template → next task has the item.

### 3.5 Context export

One-click export generates tool-specific context files from the brief:
- .cursorrules — Cursor auto-reads from project root
- CLAUDE.md — Claude Code auto-reads from project root
- AGENTS.md — Codex auto-reads from project root
- Clipboard — markdown for any tool

All files generated from the same source. Brief updates → all context files update.

---

## 4. Module 2: Review queue

### 4.1 What it does

Transforms the developer from a real-time AI supervisor into a batch reviewer. AI agents work in parallel, outputs accumulate in a queue, developer reviews in a focused block.

### 4.2 Queue structure

Three sections sorted by priority:
- **Ready for review**: AI completed work. Diff + intent summary available.
- **Waiting for AI**: Agent still running. Estimated completion time shown.
- **Blocked**: Agent needs developer input. Surfaced with priority.

### 4.3 Intent check

For each AI output, compare the generated diff against the original brief:
- **Verified** (green check): requirement from brief found in implementation
- **Flagged** (amber warning): implementation diverges from brief (e.g., "Brief specified Redis, agent used Caffeine")
- **Missing** (red x): brief requirement not addressed

This allows 30-second directional assessment instead of 15-minute full code read.

### 4.4 Structured feedback

Three actions, each sent back to the AI agent with full brief context:
- **Approve**: output accepted, task moves to next step
- **Fix + direction**: output close but needs specific changes. Developer provides direction.
- **Reject + reason**: output fundamentally wrong. Developer explains why.

---

## 5. Module 3: Context sync

### 5.1 Dashboard — three-layer information architecture

The dashboard prevents cognitive overload even with 20+ tasks:

**Layer 1 — "Needs your attention now" (focus area):**
System-generated 2-4 highest-priority action items. Priority logic:
1. Review-ready tasks that block other tasks (unblocks downstream)
2. Tasks approaching sprint deadline with uncompleted "must" items
3. AI agent outputs waiting for review
4. Unread link notifications

Tasks in hidden folders are excluded. Each item has a single action button.

**Layer 2 — Compact task list with grouping + filtering:**
Mini-cards (one row each) grouped by status: Blocked → In progress → Review ready → Done (collapsed). Each group is collapsible. Filtered by sprint (sidebar), folder (sidebar), and tags (sidebar). Breadcrumb shows current filter path.

**Layer 3 — Brief detail (click-through):**
Full brief content with tabs: Brief, Timeline, Links, Restore.

### 5.2 Sidebar — four zones

1. **Sprint zone**: Sprint selector + progress (day count, story count, bar)
2. **Navigation**: Dashboard, Review queue, Archive
3. **Folder tree**: Nested collapsible folders with colored dots, task counts. Hidden folders under .hidden/ shown dimmed. Drag-and-drop reorder. Right-click context menu.
4. **Tag zone**: Clickable filter chips. Multi-select AND logic. User-defined.

### 5.3 Session restore

Per-task restore view showing:
- Session snapshot: last active, what you were doing, current step, assigned tool
- What changed since last session: new events, linked task updates
- Suggested next actions: unchecked "must" checklist items
- One-click context export to AI tool

### 5.4 Cross-task link detection

**Rule-based (Layer 1)**: Extract tags from brief text (technologies, patterns, services, conventions, constraints). Compare across briefs using weighted Jaccard similarity. Score >= 0.6 auto-links, 0.3-0.6 suggests.

**Weights**: conventions 0.6, patterns 0.5, services 0.4, technologies 0.3, constraints 0.3.

**Link notifications**: When a linked decision changes, amber banner in target brief with Accept/Ignore buttons.

### 5.5 Task timeline

Vertical timeline of all events per task: brief created, checklist items completed, decisions logged, reviews submitted, status changes, links detected. Each entry has timestamp, title, and detail.

---

## 6. Module 4: Task graph & relationships

### 6.1 Three relationship types

| Type | Expression | Example |
|------|-----------|---------|
| Parent → child (sub-tasks) | Subdirectory | AIR deprovisioning/01-cache-layer/ |
| Task → task (explicit) | relations: in .meta.yaml | blocks, blocked-by, depends-on, related-to |
| Shared context | _resources/ + links | API specs, architecture docs referenced by multiple tasks |

### 6.2 Sub-tasks

Sub-tasks are subdirectories under a parent task folder. Each has its own brief.md, checklist.md, .meta.yaml. Prefix numbers (01-, 02-) control order. decisions.md stays at parent level (shared). Parent progress = aggregate of sub-task statuses. Sub-tasks inherit sprint, folder, tags from parent.

### 6.3 Explicit relationships

Defined in .meta.yaml using relative filesystem paths:
- **blocks**: Must complete before target can proceed. Dashboard shows blocked tasks.
- **blocked-by**: Inverse of blocks.
- **depends-on**: Soft dependency. Can proceed in parallel but benefits from target completing first.
- **related-to**: Informational. Complements auto-detected links.

### 6.4 Shared resources

_resources/ is a top-level directory for docs referenced by multiple tasks: API specs, architecture decisions, team standards. Referenced in brief.md as markdown links and in .meta.yaml as resources: entries. Context export can inline referenced resources.

### 6.5 Task graph visualization

Interactive dependency graph showing all tasks as nodes, relationships as arrows. Color-coded by status. Highlights critical path (longest blocking chain). Supports filtering by sprint, folder, or scope.

### 6.6 Enriched task card

Task detail page includes:
- **People**: owner, reviewer, stakeholder with avatar chips
- **External links**: Jira (with status), Confluence, test cases (with pass rate), GitHub PRs (with merge state), Figma, Slack. Extensible type system (jira, confluence, test-cases, github-pr, figma, slack, resource, url).
- **Task relationships**: explicit relations + auto-detected links, displayed together
- **Sub-task progress**: card grid showing each sub-task status

### 6.7 Sprint workflow (Kanban)

Six columns: Backlog → Blocked → AI working → In progress → Review → Done. "AI working" is unique to Mission Control. Tasks can be dragged between columns.

---

## 7. Module 5: Dynamic plan & archive

### 7.1 Living plan

The plan is a daily task list that updates continuously, not a one-time schedule.

**Per-item actions**:
- **Done** (checkmark): Mark complete, record actual time
- **Defer** (clock): Push to next day. AI checks sprint deadline impact.
- **Suspend** (pause): Park indefinitely. Remove from active plan and all views.
- **Drag reorder**: Manual priority adjustment

**Top-level actions**:
- Insert task: Add urgent/unplanned work
- Report disruption: Trigger AI replan for common scenarios
- AI rebalance: Let AI re-optimize remaining sprint tasks

### 7.2 AI task planning

AI reads the full sprint context and generates an optimal execution plan:

**Inputs**: All tasks + .meta.yaml, all relations, sprint deadline, checklist status, review queue state, historical velocity.

**Logic**: Topological sort on dependency graph → weight by blocking-chain length → factor sprint deadline proximity + "must" item count → respect blocked/AI-working states → output daily plan with time estimates.

**Output**: plan.md in sprint folder. Human-readable, human-editable. AI updates it, you override.

### 7.3 Disruption handling

Four pre-built scenarios with one-click AI replan:
- **Urgent task incoming**: P0 bug. AI inserts as #1, pushes other items, checks deadline risk.
- **Reduced capacity**: Half day off, meetings. AI compresses plan into available hours, defers non-critical items.
- **Blocker resolved**: Blocked task unblocked. AI inserts at correct priority position.
- **Scope change**: Requirements grew. AI re-estimates, suggests what to cut.

### 7.4 Summaries & archive

**Daily summary** (daily-log.md, appended each day):
- Completed items with actual time
- Items still in progress
- Decisions made today
- Tomorrow plan preview
- Auto-generated standup message (copy-paste to Slack)

**Sprint summary** (SUMMARY.md, generated on sprint close):
- Completion rate + breakdown bar chart
- AI efficiency stats (avg iteration rounds, checklist pre-coverage, links found)
- Key decisions made this sprint
- Carry-over dispositions for each incomplete task
- Retrospective notes section (fill in during retro)

**Carry-over options** for incomplete tasks:
- **Carry to next sprint**: mv task folder to next sprint directory. Preserves everything.
- **Suspend**: mv to .hidden/Suspended/. Hidden from all views.
- **Move to backlog**: mv to Backlog/ folder. No sprint deadline.

---

## 8. Navigation & layout

### 8.1 App structure

Left sidebar (240px) with 4 zones: sprint selector, navigation, folder tree, tag filters. Main content area with top bar (title, sprint badge, search, "+ New brief" button), breadcrumb, and content.

### 8.2 View modes

| View | Access | Shows |
|------|--------|-------|
| Dashboard | Home page | Focus area + grouped task list |
| Task graph | Dashboard toolbar | Visual dependency map |
| Kanban | Dashboard toolbar | Sprint workflow columns |
| Brief detail | Click any task | Full brief with tabs |
| Review queue | Sidebar nav | All review items |
| Plan | Dashboard or toolbar | Living daily plan |
| Daily summary | End of day | Recap + standup export |
| Sprint summary | Sprint close | Full sprint archive |

### 8.3 Design aesthetic

Clean, minimal, flat. No gradients or shadows. Thin borders (0.5px-1px). Purple (#534AB7) primary accent. Status colors: green (success), amber (active/warning), red (blocked/error), blue (info/AI-working), gray (neutral). Light/dark mode. Monospace for code, sans-serif for everything else.

---

## 9. Key interactions to get right

1. Creating a brief → selecting template → checklist auto-populates → assigning to folder and sprint → organized from the start
2. Checking off checklist items with resolved values → progress bar updating → satisfying loop
3. Dashboard focus area → opening the app → immediately seeing 2-3 actionable items → zero decision fatigue
4. Sprint selector → switching sprints → only relevant tasks visible
5. Folder navigation → clicking into a service folder → seeing only that service's tasks → hiding irrelevant folders
6. Tag filtering → clicking "high-risk" → seeing all high-risk tasks across folders
7. Task graph → seeing the full dependency picture → knowing which review unblocks the most
8. Context export → paste into AI tool → AI has full context → first-round accuracy
9. AI plan → accepting/adjusting daily plan → knowing exactly what to do next
10. Disruption → "I have 2 hours today" → AI replans → adapted in seconds
11. Session restore → back after 2 days → seeing exactly where you left off
12. Sprint close → carry/suspend/backlog each incomplete task → clean start next sprint
13. Daily standup export → one click → formatted message ready for Slack

---

## 10. Implementation roadmap

### Phase 1: MVP (Weeks 1-3)
- File-based storage (brief.md, checklist.md, decisions.md, .meta.yaml)
- SQLite index cache with file watcher
- 5 checklist templates
- Dashboard with focus area + grouped task list
- Context export to .cursorrules / CLAUDE.md / AGENTS.md
- Folder tree sidebar

### Phase 2: Review & relationships (Weeks 4-6)
- Review queue with intent checking
- Explicit task relations (blocks/depends-on/related-to)
- Sub-task support (subdirectories)
- Task graph visualization
- Git hook integration for auto-collecting AI outputs

### Phase 3: Planning & sync (Weeks 7-9)
- Sprint integration (selector, progress, deadline awareness)
- AI task planning with daily plan generation
- Disruption handling (urgent task, reduced capacity, scope change)
- Cross-task link detection (rule-based)
- Session restore

### Phase 4: Archive & intelligence (Weeks 10-12)
- Daily/sprint summaries and archive
- Carry-over workflow (carry, suspend, backlog)
- Enriched task cards (people, external links)
- Kanban workflow view
- Personal checklist layer (learning from history)
- MCP server for bidirectional AI tool integration
