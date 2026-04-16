# AI Dev Mission Control — Product Design Document

> Version 3.0 | April 2026
> A collaborative coordination layer that sits above AI coding tools to reduce cognitive overhead.

---

## 1. Problem statement

AI coding tools (Cursor, Claude Code, Codex, Kiro) have compressed production time but inflated coordination and cognitive overhead. Developers now act as managers of multiple AI agents, suffering from:

- **Iterative back-and-forth**: A typical feature requires 5-7 rounds of AI interaction. Most "supplements" (caching, feature flags, metrics, logging) are predictable but not captured upfront.
- **Cross-task context switching**: Developers manage 3-5 concurrent tasks across different AI workspaces, repos, and stages. Each switch requires dumping one mental context and loading another. AI tools have no memory across sessions.
- **Review fatigue**: Every AI output requires judgment calls — is this correct, does it match intent, what's missing. This is cognitively expensive and done across many contexts in rapid succession.
- **Team coordination gap**: Task briefs, decisions, and AI context live in individual developers' heads or local machines. No shared visibility into who's working on what, what decisions were made, or where blockers exist. Code review lacks architectural context.

**Core insight**: The developer's bottleneck has shifted from code production to decision-making (architecture, error handling, tradeoffs). Mission Control protects decision-making energy by reducing unnecessary cognitive load — for individuals and across teams.

---

## 2. Solution overview

Mission Control is a collaborative coordination layer with six integrated modules:

| Module | Purpose | Key pain solved |
|--------|---------|-----------------|
| Task Brief System | Structured task specs with checklists + decision logs | Reduces AI iteration rounds from 5-7 to 2-3 |
| Review Queue | Batched async review of AI outputs with intent checking | Eliminates real-time AI babysitting |
| Context Sync | Cross-task dashboard, session restore, link detection | Eliminates "where was I?" context rebuild |
| Task Graph & Relationships | Visual dependency map, enriched task cards, workflow view | Provides global view, prevents blind spots |
| Dynamic Plan & Archive | Living daily plan, disruption handling, daily/sprint summaries | Keeps the plan alive as reality changes |
| Collaboration & Sharing | Contacts, roles, assignment, real-time co-editing, notifications | Shared context across team members |

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

## 8. Module 6: Collaboration & sharing

### 8.1 Contact system

A shared directory of people who interact with tasks. Each contact has: name, email, avatar, team, role title, and external IDs (Jira account, Slack user, GitHub username).

**Contact sources (progressive)**:
- Phase 1: Manual entry in Dashboard
- Phase 2: Auto-import from Jira project members and Slack workspace
- Phase 3: Corporate LDAP / SSO directory sync

Contacts are shared across the project. When a Jira issue is linked to a task, the assignee from Jira is automatically suggested as a contact.

### 8.2 Project roles (who can see what)

| Role | View tasks | Create tasks | Edit any task | Manage members | Settings |
|------|-----------|-------------|--------------|---------------|----------|
| Admin | All | Yes | Yes | Yes | Yes |
| Member | All | Yes | Own tasks only | No | No |
| Viewer | All | No | No | No | No |
| External | Assigned tasks only | No | No | No | No |

### 8.3 Task roles (who does what)

Each task has people assigned with specific roles:

- **Owner**: The person doing the work. Full edit rights. Receives all notifications. One owner per task (can be reassigned).
- **Reviewer**: Reviews AI output and code. Receives review-ready notifications. Can approve/reject in review queue. Multiple allowed.
- **Collaborator**: Co-works on the task. Can edit brief, check items, log decisions. Receives status change notifications. Multiple allowed.
- **Stakeholder**: Interested party. Read-only. Receives completion notification only (e.g., PM, tech lead).
- **Watcher**: Self-subscribed observer. Read-only. Receives all change notifications. Anyone can watch any visible task.

### 8.4 Task assignment flow

Three assignment mechanisms:
- **Admin assigns**: Admin creates task, assigns owner + reviewer
- **Self-claim**: Unassigned task in backlog, member clicks "Claim" to become owner
- **Reassign**: Admin or current owner transfers ownership to another member

### 8.5 Collaborative editing

- **Comments on brief**: Inline comments on any section of brief.md. Thread-based, resolvable.
- **@mentions**: In decisions and comments, @mention a contact to notify them.
- **Edit history**: Who changed what, when. Diff view for brief changes. Powered by version tracking in DB.
- **Presence indicators**: Avatar + "editing" shown when someone is actively editing a section. Optimistic locking (warn, don't block).

### 8.6 Dashboard — multi-user additions

- **View switcher**: "My tasks" (default) / "Team tasks" / "All tasks". "My tasks" shows tasks where you are owner, reviewer, or collaborator.
- **Avatar stack on cards**: Each task card shows assigned people (owner + reviewer), max 3 with "+N" overflow.
- **Activity feed**: Optional sidebar panel showing recent team actions: "James approved Data pipeline review", "Sarah commented on AIR brief".
- **Presence dots**: Green dot on avatars of people currently viewing a task.

### 8.7 Notifications

- **In-app**: Bell icon with unread count. Dropdown showing recent events relevant to you.
- **Email digest**: Optional daily digest of task updates (configurable per user).
- **Slack webhook**: Optional push to team Slack channel.
- **Role-based filtering**: Owner gets everything. Reviewer gets review-ready. Stakeholder gets completion only. Configurable per user.

---

## 9. Navigation & layout

### 9.1 App structure

Left sidebar (240px) with 4 zones: sprint selector, navigation, folder tree, tag filters. Main content area with top bar (title, sprint badge, search, "+ New brief" button), breadcrumb, and content.

### 9.2 View modes

| View | Access | Shows |
| Dashboard | Home page | Focus area + grouped task list |
| Task graph | Dashboard toolbar | Visual dependency map |
| Kanban | Dashboard toolbar | Sprint workflow columns |
| Brief detail | Click any task | Full brief with tabs |
| Review queue | Sidebar nav | All review items |
| Plan | Dashboard or toolbar | Living daily plan |
| Daily summary | End of day | Recap + standup export |
| Sprint summary | Sprint close | Full sprint archive |

### 9.3 Design aesthetic

Clean, minimal, flat. No gradients or shadows. Thin borders (0.5px-1px). Purple (#534AB7) primary accent. Status colors: green (success), amber (active/warning), red (blocked/error), blue (info/AI-working), gray (neutral). Light/dark mode. Monospace for code, sans-serif for everything else.

---

## 10. Key interactions to get right

1. Creating a brief → selecting template → checklist auto-populates → assigning owner + reviewer → organized from the start
2. Checking off checklist items with resolved values → progress bar updating → team sees progress in real-time
3. Dashboard focus area → opening the app → immediately seeing 2-3 actionable items → zero decision fatigue
4. View switcher → "My tasks" vs "Team tasks" → clear personal vs team perspective
5. Sprint selector → switching sprints → only relevant tasks visible
6. Folder navigation → clicking into a service folder → seeing only that service's tasks → hiding irrelevant folders
7. Tag filtering → clicking "high-risk" → seeing all high-risk tasks across folders
8. Task graph → seeing the full dependency picture → knowing which review unblocks the most
9. Context export → paste into AI tool → AI has full context → first-round accuracy
10. AI plan → accepting/adjusting daily plan → knowing exactly what to do next
11. Disruption → "I have 2 hours today" → AI replans → adapted in seconds
12. Session restore → back after 2 days → seeing exactly where you left off
13. Sprint close → carry/suspend/backlog each incomplete task → clean start next sprint
14. Daily standup export → one click → formatted message ready for Slack
15. Assigning a task → owner gets notification + full brief context → immediate onboarding
16. @mention in decision log → stakeholder gets notified → decision visible to the right people
17. Claiming an unassigned task → one click → you're the owner with full context

---

## 11. Implementation roadmap

### Phase 1: Solo MVP (Weeks 1-3)
- Local-first: SQLite + file-based storage
- 5 checklist templates
- Dashboard with focus area + grouped task list
- Context export to .cursorrules / CLAUDE.md / AGENTS.md
- Folder tree sidebar
- Single-user, no auth

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
- Daily/sprint summaries and archive

### Phase 4: Team collaboration (Weeks 10-14)
- Migrate storage to PostgreSQL (keep local file bridge via mc sync)
- Contact system (manual entry + Jira/Slack import)
- Project roles (admin/member/viewer/external) + auth (SSO/email invite)
- Task roles (owner/reviewer/collaborator/stakeholder/watcher)
- Task assignment + self-claim
- Real-time sync via WebSocket
- In-app notifications + email digest + Slack webhook
- Collaborative editing with comments, @mentions, presence indicators
- View switcher (My tasks / Team tasks / All tasks)
- Activity feed
- Docker Compose deployment for team self-hosting

### Phase 5: Intelligence & scale (Weeks 15-18)
- Enriched task cards with live external link status sync
- Kanban workflow view
- Personal checklist layer (learning from history)
- MCP server for bidirectional AI tool integration
- Semantic cross-task matching (embeddings)
- LDAP/SSO directory sync
- Cloud deployment option (multi-org SaaS)
