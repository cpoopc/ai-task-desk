# AI Dev Mission Control — Technical Design Document

> Version 3.0 | April 2026
> Hybrid storage architecture with progressive deployment: solo (SQLite) → team (PostgreSQL) → cloud (SaaS).

---

## 1. Architecture overview

### 1.1 Design principles

- **Progressive deployment**: Solo mode (SQLite + files) → Team mode (PostgreSQL + WebSocket) → Cloud mode (SaaS). Each mode preserves all data from the previous.
- **Filesystem philosophy preserved**: Even with PostgreSQL, `mc sync` maintains local .mc/ files for AI tool integration and offline editing.
- **Hybrid storage**: Human-editable content can be synced to local files. Machine-generated data lives in the database.
- **Three AI integration layers**: Layer 1 (files) works today. Layer 2 (hooks) adds automation. Layer 3 (MCP) adds real-time.
- **Collaboration-ready**: Multi-user auth, roles, real-time sync, and notifications built into the data model from the start (activated in Phase 4).

### 1.2 System topology

**Solo mode (Phase 1-3):**
```
Developer Machine
  ├── MC CLI + Dashboard (localhost:4200)
  ├── .mc/ directory (markdown + yaml files)
  ├── .cache/index.db (SQLite)
  └── File Exporter → .cursorrules / CLAUDE.md
```

**Team mode (Phase 4+):**
```
┌─────────────────────────────────────────────────┐
│  Team Server (Docker Compose or VPS)            │
│                                                  │
│  ┌────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ PostgreSQL │  │ REST API │  │  WebSocket   │ │
│  │            │◄─┤ (Express)├──┤  (Socket.io) │ │
│  └────────────┘  └────┬─────┘  └──────┬──────┘ │
│                       │               │         │
└───────────────────────┼───────────────┼─────────┘
                        │               │
          ┌─────────────┼───────────────┤
          │             │               │
    ┌─────┴──┐   ┌─────┴──┐     ┌─────┴──┐
    │ User A │   │ User B │     │ User C │
    │ (web)  │   │ (web)  │     │(CLI+web)│
    └────────┘   └────────┘     └───┬────┘
                                    │
                            ┌───────┴────────┐
                            │ mc sync        │
                            │ local .mc/     │
                            │ for AI tools   │
                            └────────────────┘
```

### 1.3 Technology stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| CLI | Node.js + Commander | Same runtime as AI tools |
| Dashboard | React + TypeScript + Tailwind | Lightweight web UI |
| API server | Node.js + Express | Serves dashboard + REST endpoints |
| Database (Solo) | SQLite via better-sqlite3 | Zero config, single file |
| Database (Team) | PostgreSQL 16 | Multi-user, concurrent writes, real-time |
| Real-time sync | Socket.io | WebSocket with fallback, rooms, namespaces |
| Auth | JWT + passport.js | SSO/LDAP/email login, session management |
| File watcher | chokidar | Cross-platform FS events (solo mode) |
| File sync | mc sync CLI | Bidirectional DB ↔ local files bridge |
| MCP server | @modelcontextprotocol/sdk | Official SDK, stdio transport |
| Template engine | Handlebars | Brief → context file generation |
| Deployment | Docker Compose | Team self-hosting |
| Monorepo | npm workspaces | Shared code across packages |

---

## 2. Hybrid storage model

### 2.1 The boundary

**Human creates/edits → filesystem. Machine generates → SQLite/PostgreSQL.**

| Data | Storage | Reason |
|------|---------|--------|
| Brief content (goal, details, constraints) | File | Human writes, AI reads, any editor |
| Checklist items + status | File | Markdown [x] syntax, universal |
| Decision log | File | Human writes rationale, standalone doc |
| Task metadata (status, tags, people, links) | File | YAML, human might edit manually |
| Directory structure (folders, sprints) | File | mkdir/mv = organize, natural ops |
| Review items (diff, intent checks, feedback) | DB | System-generated, never hand-edited |
| Cross-task links + scores | DB | Computed by engine, re-computable |
| Timeline events | DB | High-frequency append, derived from changes |
| Notifications | DB | Transient UI state, read/dismiss |
| Extracted tags (auto-detected) | DB | Derived from text, rebuilt on parse |
| Full-text search index | DB | Performance, FTS5 virtual table |
| Users, contacts, roles, comments | DB (Team) | Multi-user, never in files |

**Validation test**: Delete index.db → rebuild from files → zero content loss. Delete .mc/ directory → cannot recover from DB → confirms boundary is correct.

### 2.2 Filesystem layout

```
.mc/
├── .config.yaml                        # Global settings, Jira config
├── .cache/
│   └── index.db                        # SQLite (machine data + derived index)
│
├── _resources/                         # Shared docs (not tasks)
│   ├── api-specs/
│   │   ├── air-entitlement-api.md
│   │   └── payment-gateway-api.md
│   └── architecture/
│       ├── gateway-filter-pattern.md
│       └── caching-strategy.md
│
├── _templates/                         # Checklist templates
│   ├── api_dependency/
│   │   ├── checklist.md
│   │   └── .meta.yaml
│   ├── endpoint/
│   ├── schema_change/
│   ├── bug_fix/
│   └── refactor/
│
├── Sprint 24 (Apr 7-21)/              # Sprint = top-level folder
│   ├── .sprint.yaml                    # Sprint metadata
│   ├── plan.md                         # Living daily plan
│   ├── daily-log.md                    # Appended daily summaries
│   │
│   ├── Backend services/               # Category folder
│   │   ├── .folder.yaml               # Optional: color, sort order
│   │   │
│   │   ├── AIR deprovisioning/         # Task = folder
│   │   │   ├── brief.md
│   │   │   ├── checklist.md
│   │   │   ├── decisions.md
│   │   │   ├── .meta.yaml
│   │   │   ├── 01-cache-layer/         # Sub-task = subfolder
│   │   │   │   ├── brief.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── .meta.yaml
│   │   │   ├── 02-feature-flag/
│   │   │   └── 03-circuit-breaker/
│   │   │
│   │   ├── Payment retry/
│   │   └── Auth token refresh/
│   │
│   ├── Frontend/
│   │
│   └── .hidden/                        # Hidden folder convention
│       ├── Suspended/                  # Parked tasks
│       └── Infra/                      # Hidden category
│
├── Sprint 23 (closed)/
│   └── SUMMARY.md                      # Sprint archive
│
└── Backlog/                            # No-sprint tasks
```

### 2.3 File formats

**.meta.yaml** (per task):
```yaml
status: active              # drafting | active | review | blocked | done
current_step: 5
total_steps: 7
assigned_tool: cursor
template_type: api_dependency
jira_key: AIR-1234
tags: [caching, api-dep, high-risk]
last_activity: "Verifying cache in lab"
created_at: 2026-04-13T10:00:00Z
last_active_at: 2026-04-15T10:42:00Z

people:
  - name: "You"
    role: owner
  - name: "James W."
    role: reviewer
    email: james.w@company.com
  - name: "Sarah M."
    role: stakeholder
    team: "AIR team"

links:
  - type: jira
    key: AIR-1234
    url: https://jira.company.com/browse/AIR-1234
  - type: confluence
    title: "AIR Deprovisioning Design"
    url: https://wiki.company.com/pages/air-deprov
  - type: test-cases
    title: "TC-AIR-001 ~ TC-AIR-015"
    url: https://testrail.company.com/suites/view/123
  - type: github-pr
    title: "PR #3421"
    url: https://github.com/company/air-service/pull/3421
    status: merged
  - type: resource
    path: "/_resources/api-specs/air-entitlement-api.md"

relations:
  - type: blocks
    target: "../Auth token refresh"
    reason: "Needs AIR pattern established first"
  - type: related-to
    target: "../Payment retry"
    reason: "Shared gateway filter pattern"

resources:
  - path: "/_resources/api-specs/air-entitlement-api.md"
    label: "AIR API spec"
```

**.sprint.yaml** (per sprint folder):
```yaml
jira_sprint_id: "12345"
start_date: 2026-04-07
end_date: 2026-04-21
status: active
total_stories: 8
completed_stories: 5
```

**.folder.yaml** (per category folder, optional):
```yaml
color: "#BA7517"
sort_order: 1
```

**plan.md** (per sprint, living plan):
```markdown
## Apr 17 (Today)
- [x] Review Data pipeline migration (28 min) <!--done:10:15-->
- [ ] AIR deprovisioning — circuit breaker (~2h) <!--status:in-progress-->
- [ ] Review Payment retry AI output (~15 min)

## Apr 18
- [ ] Review Notif refactor AI output (~30 min)
- [ ] AIR degradation test (~2h)

## Parked
- Auth token refresh — blocked externally

## Suspended
```

**daily-log.md** (per sprint, appended):
```markdown
## Apr 17
### Completed
- Review Data pipeline migration (28 min) — approved
### In progress
- AIR circuit breaker (70%)
### Decisions
- Circuit breaker: 5 failures/30s, half-open 60s, Resilience4j
### Tomorrow
- Finish AIR circuit breaker, review Notif refactor
```

### 2.4 Filesystem operations = business operations

| Filesystem operation | Mission Control effect |
|---------------------|----------------------|
| mkdir "New task/" | Create a task |
| mv task/ ../Sprint25/ | Reassign to next sprint |
| mv task/ ../.hidden/Suspended/ | Suspend (park indefinitely) |
| mv folder/ ../.hidden/ | Hide a folder |
| rm -rf task/ | Delete a task |
| vim checklist.md → [x] | Complete a checklist item |
| echo >> decisions.md | Log a decision |
| cp -r _templates/api_dep/ task/ | Create from template |
| git add . && git commit | Version control all state |
| git pull | Sync team's briefs |

---

## 3. SQLite schema (Solo mode)

```sql
-- Mirrored from filesystem (rebuilt on scan)
CREATE TABLE briefs_index (
  id TEXT PRIMARY KEY,
  folder_path TEXT NOT NULL UNIQUE,
  title TEXT,
  status TEXT,
  current_step INTEGER,
  total_steps INTEGER,
  assigned_tool TEXT,
  sprint_name TEXT,
  folder_name TEXT,
  parent_task_path TEXT,
  user_tags TEXT,                     -- JSON from .meta.yaml
  extracted_tags TEXT,                -- JSON from detection engine
  checklist_total INTEGER,
  checklist_done INTEGER,
  is_hidden INTEGER DEFAULT 0,
  jira_key TEXT,
  last_activity TEXT,
  last_active_at TEXT,
  indexed_at TEXT
);
CREATE INDEX idx_bi_sprint ON briefs_index(sprint_name);
CREATE INDEX idx_bi_folder ON briefs_index(folder_name);
CREATE INDEX idx_bi_parent ON briefs_index(parent_task_path);

-- Full-text search
CREATE VIRTUAL TABLE briefs_fts USING fts5(
  title, goal, technical_details, decisions_text, constraints,
  content=briefs_index, content_rowid=rowid
);

-- Machine-generated: review queue
CREATE TABLE review_items (
  id TEXT PRIMARY KEY,
  brief_path TEXT NOT NULL,
  agent_tool TEXT,
  status TEXT DEFAULT 'pending',
  diff_summary TEXT,
  files_changed TEXT,                 -- JSON
  intent_checks TEXT,                 -- JSON
  feedback TEXT,                      -- JSON
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT
);
CREATE INDEX idx_ri_brief ON review_items(brief_path);
CREATE INDEX idx_ri_status ON review_items(status);

-- Machine-generated: cross-task links
CREATE TABLE cross_task_links (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  target_path TEXT NOT NULL,
  link_type TEXT DEFAULT 'suggested',
  match_method TEXT,
  score REAL,
  matched_tags TEXT,                  -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT
);
CREATE INDEX idx_ctl_source ON cross_task_links(source_path);
CREATE INDEX idx_ctl_target ON cross_task_links(target_path);

-- Machine-generated: timeline
CREATE TABLE timeline_events (
  id TEXT PRIMARY KEY,
  brief_path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_te_brief ON timeline_events(brief_path);

-- Machine-generated: notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  target_path TEXT NOT NULL,
  source_path TEXT NOT NULL,
  change_description TEXT,
  status TEXT DEFAULT 'unread',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_n_target ON notifications(target_path);
```


### 1.3 Technology stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| CLI | Node.js + Commander | Same runtime as AI tools |
| Dashboard | React + TypeScript + Tailwind | Lightweight web UI |
| API server | Node.js + Express | Serves dashboard + REST endpoints |
| Database (Solo) | SQLite via better-sqlite3 | Zero config, single file |
| Database (Team) | PostgreSQL 16 | Multi-user, concurrent writes, real-time |
| Real-time sync | Socket.io | WebSocket with fallback, rooms, namespaces |
| Auth | JWT + passport.js | SSO/LDAP/email login, session management |
| File watcher | chokidar | Cross-platform FS events (solo mode) |
| File sync | mc sync CLI | Bidirectional DB ↔ local files bridge |
| MCP server | @modelcontextprotocol/sdk | Official SDK, stdio transport |
| Template engine | Handlebars | Brief → context file generation |
| Deployment | Docker Compose | Team self-hosting |
| Monorepo | npm workspaces | Shared code across packages |

---

## 2. Hybrid storage model

### 2.1 The boundary

**Human creates/edits → filesystem. Machine generates → SQLite/PostgreSQL.**

| Data | Storage | Reason |
|------|---------|--------|
| Brief content (goal, details, constraints) | File | Human writes, AI reads, any editor |
| Checklist items + status | File | Markdown [x] syntax, universal |
| Decision log | File | Human writes rationale, standalone doc |
| Task metadata (status, tags, people, links) | File | YAML, human might edit manually |
| Directory structure (folders, sprints) | File | mkdir/mv = organize, natural ops |
| Review items (diff, intent checks, feedback) | DB | System-generated, never hand-edited |
| Cross-task links + scores | DB | Computed by engine, re-computable |
| Timeline events | DB | High-frequency append, derived from changes |
| Notifications | DB | Transient UI state, read/dismiss |
| Extracted tags (auto-detected) | DB | Derived from text, rebuilt on parse |
| Full-text search index | DB | Performance, FTS5 virtual table |
| Users, contacts, assignments, comments | DB (Team) | Multi-user collaboration data |

**Validation test**: Delete index.db → rebuild from files → zero content loss. Delete .mc/ directory → cannot recover from DB → confirms boundary is correct.

### 2.2 Filesystem layout

```
.mc/
├── .config.yaml                        # Global settings, Jira config
├── .cache/
│   └── index.db                        # SQLite (machine data + derived index)
│
├── _resources/                         # Shared docs (not tasks)
│   ├── api-specs/
│   │   ├── air-entitlement-api.md
│   │   └── payment-gateway-api.md
│   └── architecture/
│       ├── gateway-filter-pattern.md
│       └── caching-strategy.md
│
├── _templates/                         # Checklist templates
│   ├── api_dependency/
│   │   ├── checklist.md
│   │   └── .meta.yaml
│   ├── endpoint/
│   ├── schema_change/
│   ├── bug_fix/
│   └── refactor/
│
├── Sprint 24 (Apr 7-21)/              # Sprint = top-level folder
│   ├── .sprint.yaml                    # Sprint metadata
│   ├── plan.md                         # Living daily plan
│   ├── daily-log.md                    # Appended daily summaries
│   │
│   ├── Backend services/               # Category folder
│   │   ├── .folder.yaml               # Optional: color, sort order
│   │   │
│   │   ├── AIR deprovisioning/         # Task = folder
│   │   │   ├── brief.md
│   │   │   ├── checklist.md
│   │   │   ├── decisions.md
│   │   │   ├── .meta.yaml
│   │   │   ├── 01-cache-layer/         # Sub-task = subfolder
│   │   │   │   ├── brief.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── .meta.yaml
│   │   │   ├── 02-feature-flag/
│   │   │   └── 03-circuit-breaker/
│   │   │
│   │   ├── Payment retry/
│   │   └── Auth token refresh/
│   │
│   ├── Frontend/
│   │
│   └── .hidden/                        # Hidden folder convention
│       ├── Suspended/                  # Parked tasks
│       └── Infra/                      # Hidden category
│
├── Sprint 23 (closed)/
│   └── SUMMARY.md                      # Sprint archive
│
└── Backlog/                            # No-sprint tasks
```

### 2.3 File formats

**.meta.yaml** (per task):
```yaml
status: active              # drafting | active | review | blocked | done
current_step: 5
total_steps: 7
assigned_tool: cursor
template_type: api_dependency
jira_key: AIR-1234
tags: [caching, api-dep, high-risk]
last_activity: "Verifying cache in lab"
created_at: 2026-04-13T10:00:00Z
last_active_at: 2026-04-15T10:42:00Z
```

people:
  - name: "You"
    role: owner
  - name: "James W."
    role: reviewer
    email: james.w@company.com
  - name: "Sarah M."
    role: stakeholder
    team: "AIR team"

links:
  - type: jira
    key: AIR-1234
    url: https://jira.company.com/browse/AIR-1234
  - type: confluence
    title: "AIR Deprovisioning Design"
    url: https://wiki.company.com/pages/air-deprov
  - type: test-cases
    title: "TC-AIR-001 ~ TC-AIR-015"
    url: https://testrail.company.com/suites/view/123
  - type: github-pr
    title: "PR #3421"
    url: https://github.com/company/air-service/pull/3421
    status: merged
  - type: resource
    path: "/_resources/api-specs/air-entitlement-api.md"

relations:
  - type: blocks
    target: "../Auth token refresh"
    reason: "Needs AIR pattern established first"
  - type: related-to
    target: "../Payment retry"
    reason: "Shared gateway filter pattern"

resources:
  - path: "/_resources/api-specs/air-entitlement-api.md"
    label: "AIR API spec"
```

**.sprint.yaml** (per sprint folder):
```yaml
jira_sprint_id: "12345"
start_date: 2026-04-07
end_date: 2026-04-21
status: active
total_stories: 8
completed_stories: 5
```

**.folder.yaml** (per category folder, optional):
```yaml
color: "#BA7517"
sort_order: 1
```

**plan.md** (per sprint, living plan):
```markdown
## Apr 17 (Today)
- [x] Review Data pipeline migration (28 min) <!--done:10:15-->
- [ ] AIR deprovisioning — circuit breaker (~2h) <!--status:in-progress-->
- [ ] Review Payment retry AI output (~15 min)

## Apr 18
- [ ] Review Notif refactor AI output (~30 min)
- [ ] AIR degradation test (~2h)

## Parked
- Auth token refresh — blocked externally

## Suspended
```

**daily-log.md** (per sprint, appended):
```markdown
## Apr 17
### Completed
- Review Data pipeline migration (28 min) — approved
### In progress
- AIR circuit breaker (70%)
### Decisions
- Circuit breaker: 5 failures/30s, half-open 60s, Resilience4j
### Tomorrow
- Finish AIR circuit breaker, review Notif refactor
```

### 2.4 Filesystem operations = business operations

| Filesystem operation | Mission Control effect |
|---------------------|----------------------|
| mkdir "New task/" | Create a task |
| mv task/ ../Sprint25/ | Reassign to next sprint |
| mv task/ ../.hidden/Suspended/ | Suspend (park indefinitely) |
| mv folder/ ../.hidden/ | Hide a folder |
| rm -rf task/ | Delete a task |
| vim checklist.md → [x] | Complete a checklist item |
| echo >> decisions.md | Log a decision |
| cp -r _templates/api_dep/ task/ | Create from template |
| git add . && git commit | Version control all state |
| git pull | Sync team's briefs |

---

## 3. Database schema

### 3.1 SQLite schema (Solo mode)

```sql
-- Mirrored from filesystem (rebuilt on scan)
CREATE TABLE briefs_index (
  id TEXT PRIMARY KEY,
  folder_path TEXT NOT NULL UNIQUE,
  title TEXT,
  status TEXT,
  current_step INTEGER,
  total_steps INTEGER,
  assigned_tool TEXT,
  sprint_name TEXT,
  folder_name TEXT,
  parent_task_path TEXT,
  user_tags TEXT,
  extracted_tags TEXT,
  checklist_total INTEGER,
  checklist_done INTEGER,
  is_hidden INTEGER DEFAULT 0,
  jira_key TEXT,
  last_activity TEXT,
  last_active_at TEXT,
  indexed_at TEXT
);
CREATE INDEX idx_bi_sprint ON briefs_index(sprint_name);
CREATE INDEX idx_bi_folder ON briefs_index(folder_name);
CREATE INDEX idx_bi_parent ON briefs_index(parent_task_path);

CREATE VIRTUAL TABLE briefs_fts USING fts5(
  title, goal, technical_details, decisions_text, constraints,
  content=briefs_index, content_rowid=rowid
);

CREATE TABLE review_items (
  id TEXT PRIMARY KEY,
  brief_path TEXT NOT NULL,
  agent_tool TEXT,
  status TEXT DEFAULT 'pending',
  diff_summary TEXT,
  files_changed TEXT,
  intent_checks TEXT,
  feedback TEXT,
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT
);
CREATE INDEX idx_ri_brief ON review_items(brief_path);
CREATE INDEX idx_ri_status ON review_items(status);

CREATE TABLE cross_task_links (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  target_path TEXT NOT NULL,
  link_type TEXT DEFAULT 'suggested',
  match_method TEXT,
  score REAL,
  matched_tags TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  confirmed_at TEXT
);
CREATE INDEX idx_ctl_source ON cross_task_links(source_path);
CREATE INDEX idx_ctl_target ON cross_task_links(target_path);

CREATE TABLE timeline_events (
  id TEXT PRIMARY KEY,
  brief_path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_te_brief ON timeline_events(brief_path);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  target_path TEXT NOT NULL,
  source_path TEXT NOT NULL,
  change_description TEXT,
  status TEXT DEFAULT 'unread',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_n_target ON notifications(target_path);
```

### 3.2 Additional tables for Team mode (PostgreSQL)

When migrating to team mode, the above tables are recreated in PostgreSQL (TEXT → VARCHAR, etc.) plus these collaboration tables:

```sql
-- Users and authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  project_role VARCHAR(20) DEFAULT 'member',
  auth_provider VARCHAR(20) DEFAULT 'email',
  external_id VARCHAR(255),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contact directory
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url VARCHAR(500),
  team VARCHAR(100),
  role_title VARCHAR(100),
  source VARCHAR(20) DEFAULT 'local',
  jira_account_id VARCHAR(100),
  slack_user_id VARCHAR(100),
  github_username VARCHAR(100),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_user ON contacts(user_id);

-- Task-level role assignments
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_path VARCHAR(500) NOT NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  role VARCHAR(20) NOT NULL,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brief_path, contact_id)
);
CREATE INDEX idx_ta_brief ON task_assignments(brief_path);
CREATE INDEX idx_ta_contact ON task_assignments(contact_id);
CREATE INDEX idx_ta_role ON task_assignments(role);

-- Comments on brief sections
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_path VARCHAR(500) NOT NULL,
  section VARCHAR(100),
  author_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id),
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_comments_brief ON comments(brief_path);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

-- Edit history
CREATE TABLE brief_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES users(id),
  version_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_bv_brief ON brief_versions(brief_path, file_name);

-- Notification preferences
CREATE TABLE notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  in_app BOOLEAN DEFAULT true,
  email_digest VARCHAR(20) DEFAULT 'daily',
  slack_webhook_url VARCHAR(500),
  notify_on_assign BOOLEAN DEFAULT true,
  notify_on_review_ready BOOLEAN DEFAULT true,
  notify_on_mention BOOLEAN DEFAULT true,
  notify_on_completion BOOLEAN DEFAULT true,
  notify_on_link_change BOOLEAN DEFAULT true
);

-- Notification delivery log
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  brief_path VARCHAR(500),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_un_user ON user_notifications(user_id, is_read);

-- Active presence tracking
CREATE TABLE active_sessions (
  user_id UUID NOT NULL REFERENCES users(id),
  brief_path VARCHAR(500),
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, brief_path)
);
```

---

## 4. Data flow

### 4.1 Write path: Dashboard → filesystem → watcher → index (Solo)

```
User checks a checklist item in Dashboard:
1. Dashboard → PUT /api/task/:path/checklist { item, status: "done" }
2. API parses checklist.md, flips [ ] to [x], writes file
3. chokidar detects checklist.md change
4. Watcher parses updated file → updates briefs_index
5. Watcher emits timeline_event
6. Watcher re-extracts tags → re-runs link detection
7. WebSocket → Dashboard re-renders
```

### 4.2 Write path: Dashboard → PostgreSQL → WebSocket (Team)

```
User checks a checklist item in Team mode:
1. Dashboard → PUT /api/task/:path/checklist { item, status: "done" }
2. API writes to PostgreSQL (checklist_items row update)
3. Emits timeline_event row
4. Re-runs tag extraction → updates extracted_tags
5. WebSocket broadcasts { event: "checklist:toggled", path, item, by }
6. All connected clients re-render the task card in real-time
7. mc sync watch (if running) detects the change → writes checklist.md locally
```

### 4.3 Write path: External file edit → sync → DB (Team)

```
User edits brief.md in VS Code (local .mc/ from mc sync pull):
1. chokidar (mc sync watch) detects brief.md change
2. mc sync push: parses file, POST /api/sync/push
3. API validates version (reject if server version newer)
4. On success: updates PostgreSQL, broadcasts via WebSocket
5. Other users see updated brief in Dashboard
```

### 4.4 Write path: Filesystem move → watcher → index (Solo)

```
User runs: mv "AIR deprov/" "../Sprint 25/"
1. chokidar detects delete in Sprint 24 + create in Sprint 25
2. Watcher recognizes as a move (same content hash, different path)
3. Updates briefs_index: folder_path, sprint_name
4. If moved to/from .hidden/: updates is_hidden
5. Emits timeline_event (status_changed)
6. WebSocket → Dashboard refreshes sidebar + cards
```

### 4.5 Read path: Dashboard → index → render

```
Dashboard loads:
1. GET /api/dashboard → query briefs_index WHERE is_hidden=0
2. Apply sprint filter, folder filter, tag filter, user scope (my/team/all)
3. Sort: blocked first, review-ready, active, done
4. Return enriched brief list with assignment info
5. React renders focus area + grouped task list
```

### 4.6 Index rebuild (Solo)

```
mc rebuild-index:
1. Walk .mc/ directory tree recursively
2. For each task folder: parse brief.md, checklist.md, .meta.yaml
3. DROP + recreate briefs_index, briefs_fts
4. Re-run tag extraction on all briefs
5. Re-run cross-task link detection on all pairs
6. timeline_events, review_items, notifications preserved
7. ~2-3 seconds for 100 briefs
```

---

## 5. REST API

### 5.1 Dashboard & briefs
```
GET    /api/dashboard/stats             Stats for metric cards
GET    /api/dashboard/focus             Focus area items (priority-sorted)

GET    /api/briefs                      List briefs (?sprint=&folder=&tag=&status=&scope=my|team|all)
GET    /api/briefs/:path                Brief detail (brief + checklist + decisions + links + assignments)
POST   /api/briefs                      Create brief (from template)
PUT    /api/briefs/:path                Update brief fields
DELETE /api/briefs/:path                Delete task folder

PUT    /api/briefs/:path/checklist      Update checklist item
POST   /api/briefs/:path/decisions      Add decision
GET    /api/briefs/:path/timeline       Timeline events from DB
GET    /api/briefs/:path/restore        Restore context (last session + changes + next actions)
POST   /api/briefs/:path/export         Generate .cursorrules / CLAUDE.md / AGENTS.md
POST   /api/briefs/:path/move           Move task folder (sprint, category, hide/unhide)
```

### 5.2 Review queue
```
GET    /api/review                      List review items (?status=)
POST   /api/review                      Create review item (from AI agent or git hook)
GET    /api/review/:id                  Review detail with intent checks
PUT    /api/review/:id/feedback         Submit feedback (approve/fix/reject)
```

### 5.3 Links & notifications
```
GET    /api/links?path=                 Links for a brief
PUT    /api/links/:id/confirm           Confirm suggested link
PUT    /api/links/:id/dismiss           Dismiss suggested link
GET    /api/notifications?path=         Notifications for a brief
PUT    /api/notifications/:id           Accept or ignore notification
```

### 5.4 Folders & sprints
```
GET    /api/folders                     Folder tree structure
POST   /api/folders                     Create folder
PUT    /api/folders/:path               Update folder metadata
DELETE /api/folders/:path               Delete folder
PUT    /api/folders/:path/reorder       Reorder within parent

GET    /api/sprints                     List sprints
POST   /api/sprints                     Create sprint
PUT    /api/sprints/:id                 Update sprint
POST   /api/sprints/sync-jira          Sync from Jira API

GET    /api/tags                        All unique user tags
```

### 5.5 Plan
```
GET    /api/plan/:sprint                Get current plan (parsed from plan.md)
PUT    /api/plan/:sprint                Update plan → writes plan.md
POST   /api/plan/:sprint/rebalance     AI rebalance remaining tasks
POST   /api/plan/:sprint/disrupt       Handle disruption (urgent/time-off/unblock/scope)
POST   /api/plan/:sprint/daily-summary Generate daily summary → append daily-log.md
POST   /api/plan/:sprint/close         Close sprint → generate SUMMARY.md + carry-over
```

### 5.6 Search & graph
```
GET    /api/search?q=                   Full-text search across all briefs
GET    /api/graph?sprint=               Task dependency graph data (nodes + edges)
```

### 5.7 Collaboration (Team mode)
```
POST   /api/auth/login                  Login (email+password or SSO redirect)
POST   /api/auth/logout                 Logout
GET    /api/auth/me                     Current user profile

GET    /api/contacts                    List all contacts (?team=&source=)
POST   /api/contacts                    Create contact
PUT    /api/contacts/:id                Update contact
DELETE /api/contacts/:id                Delete contact
POST   /api/contacts/import-jira        Import from Jira project members
POST   /api/contacts/import-slack       Import from Slack workspace

GET    /api/briefs/:path/assignments    List assignments for a task
POST   /api/briefs/:path/assignments    Assign person to task
PUT    /api/assignments/:id             Change role
DELETE /api/assignments/:id             Remove assignment
POST   /api/briefs/:path/claim          Self-claim as owner

GET    /api/briefs/:path/comments       List comments (threaded)
POST   /api/briefs/:path/comments       Add comment (?section= for inline)
PUT    /api/comments/:id                Edit comment
PUT    /api/comments/:id/resolve        Resolve comment thread
DELETE /api/comments/:id                Delete comment

GET    /api/notifications/user          Current user's notifications (?unread_only=)
PUT    /api/notifications/user/:id/read Mark as read
PUT    /api/notifications/user/read-all Mark all as read
GET    /api/notifications/user/prefs    Get notification preferences
PUT    /api/notifications/user/prefs    Update preferences

GET    /api/activity                    Team activity feed (?limit=&before=)
-- Presence via WebSocket: ws://server/presence → { user_id, brief_path, action }
```

### 5.8 File sync (mc sync CLI)
```
POST   /api/sync/pull                   Download changed files since last sync
POST   /api/sync/push                   Upload locally changed files to DB
GET    /api/sync/status                 Check sync state (local vs server versions)
```

---

## 6. Cross-task detection engine

### 6.1 Tag extraction

Runs on every brief save. Parses structured fields into normalized tags:
- **Technologies**: keyword map (caffeine, redis, spring, kafka, grpc, postgres, etc.)
- **Patterns**: regex rules (cache → "caching", lru → "lru-cache", feature flag → "feature-flag", etc.)
- **Services**: from filesAffected[].repo in brief.md
- **Conventions**: from feature flag name patterns and metric name patterns
- **Constraints**: normalized from constraints in brief.md

### 6.2 Weighted Jaccard scoring

```
For each category: jaccard = |intersection| / |union|
Weighted score = sum(jaccard * weight) / sum(weights)

Weights: conventions 0.6, patterns 0.5, services 0.4, technologies 0.3, constraints 0.3

Score >= 0.6 → auto-link
Score 0.3-0.6 → suggested link
Score < 0.3 → ignore
```

### 6.3 Link propagation

When a decision changes in brief A that has an auto/confirmed link to brief B:
1. Compare old and new decision text
2. Create notification in DB (user_notifications for all watchers of brief B)
3. Broadcast via WebSocket to connected clients
4. Dashboard shows amber banner with Accept/Ignore

---

## 7. AI integration layers

### 7.1 Layer 1: File-based (works today, 70% of value)

Mission Control generates .cursorrules, CLAUDE.md, AGENTS.md from brief content using Handlebars templates. Written to project root. AI tools auto-read at session start.

### 7.2 Layer 2: CLI hooks (automation)

- **Claude Code hooks**: post-task script collects diff, sends to review queue
- **Git hooks**: post-commit detects AI-generated commits, routes to review
- **File watchers**: monitor Cursor workspace for background agent completion

### 7.3 Layer 3: MCP server (real-time, Phase 5)

Mission Control as MCP server with tools:
- mc_get_brief — agent retrieves full context
- mc_log_decision — agent records decisions during implementation
- mc_update_checklist — agent checks off items
- mc_request_review — agent submits work to queue
- mc_get_feedback — agent retrieves developer review feedback
- mc_flag_blocker — agent asks developer questions via dashboard

---

## 8. AI task planner

### 8.1 Input context

All tasks in sprint + .meta.yaml, all relations, sprint deadline (days remaining), checklist status, review queue state, historical velocity.

### 8.2 Planning algorithm

1. Parse dependency graph from relations: fields
2. Topological sort → base execution order
3. Weight by: blocking-chain length (longer = higher priority)
4. Factor: sprint deadline proximity, "must" item count remaining
5. Skip: blocked tasks (external), suspended tasks
6. Assign to days based on estimated hours
7. Reserve buffer time on last day

### 8.3 Disruption replan

On disruption trigger:
1. Remove affected time slots
2. Re-run planning algorithm on remaining tasks
3. Flag items at risk of missing sprint deadline
4. Present adjusted plan with diff from previous

### 8.4 Output

plan.md in sprint folder. Markdown checklist format with HTML comments for machine-readable metadata (timestamps, status). Human can edit directly.

---

## 9. Performance targets

| Operation | Target | Approach |
|-----------|--------|----------|
| Brief load from index | <50ms | SQLite indexed query |
| Tag extraction | <100ms | Regex + keyword match |
| Rule-based link detection | <200ms for 50 briefs | O(n) scan, Jaccard per pair |
| Context export | <300ms | Handlebars render + file write |
| Intent check | <500ms | Regex match against diff |
| Session restore | <1s | Brief load + diff since + export |
| Full index rebuild | <3s for 100 briefs | Walk tree + parse all files |
| Dashboard render | <100ms | React + local REST |
| File watcher response | <500ms | chokidar event → index update → WebSocket |
| WebSocket broadcast | <100ms | Socket.io room emit |
| PostgreSQL query (team) | <50ms | Indexed queries, connection pooling |

---

## 10. Security & privacy

- **Solo mode**: All data in ~/.mc/ on developer's machine. No network access.
- **Team mode**: JWT auth on every API request. Role checked before every write. HTTPS enforced.
- **MCP transport**: stdio (no network socket), within local process boundary.
- **.gitignore**: Generated context files (.cursorrules, CLAUDE.md) not committed by default.
- **Jira/Slack sync**: Optional, requires user-configured API token in .config.yaml.
- **Passwords**: bcrypt hashed. No plaintext stored.
- **SSO**: OAuth 2.0 / SAML 2.0. Tokens validated server-side on every request.
- **Local file bridge**: mc sync uses HTTPS to team server. Files stored on developer's machine only.

---

## 11. Five golden rules

### Solo mode (Phase 1-3):
1. **Filesystem is source of truth for content.** If a brief says one thing in the file and something different in index.db, the file wins.
2. **Dashboard writes go through filesystem.** UI modifies files first, watcher updates index. Never write to DB directly for file-backed content.
3. **DB owns machine-generated data exclusively.** Reviews, links, timeline, notifications live only in SQLite.
4. **Directory structure = organization.** Moving folders = reorganizing. Sprint = which sprint folder. Hidden = under .hidden/.
5. **Index is always rebuildable.** `mc rebuild-index` reconstructs from files in seconds. Safe to run anytime.

### Team mode (Phase 4+):
1. **PostgreSQL is source of truth for everything.** All reads and writes go through the API to Postgres.
2. **Local files are a synced copy.** `mc sync pull` downloads from DB, `mc sync push` uploads changes. Files exist for AI tool compatibility and offline editing.
3. **Conflict resolution**: Last-write-wins for simple fields. Version-based diff for long text (brief.md, decisions.md).
4. **Real-time via WebSocket.** Every DB write triggers a broadcast. Connected clients update immediately.
5. **Auth on every request.** JWT token required. Role checked before every write operation.

---

## 12. Real-time sync architecture (Team mode)

### 12.1 WebSocket events

```
Server → Client:
  brief:updated         { path, fields_changed, updated_by }
  checklist:toggled     { path, item_id, status, toggled_by }
  decision:added        { path, decision, added_by }
  review:submitted      { path, review_id, agent_tool }
  review:feedback       { review_id, action, by }
  comment:added         { path, comment, author }
  assignment:changed    { path, contact, role, action }
  presence:update       { path, user_id, action }
  notification:new      { notification }
  plan:updated          { sprint, changes }
  link:detected         { source_path, target_path, score }

Client → Server:
  presence:viewing      { path }
  presence:editing      { path, section }
  presence:left         { path }
```

### 12.2 Sync protocol (mc sync)

```
mc sync pull:
  1. GET /api/sync/status → { path → version_hash } for all briefs
  2. Compare with local .mc/.sync-state.json
  3. For each changed brief: download content
  4. Write to local .mc/ files
  5. Update .sync-state.json

mc sync push:
  1. Scan local .mc/ for files modified since last sync (by mtime)
  2. For each changed file: parse content, POST/PUT to API
  3. Server validates version (reject if server version > local base version)
  4. On conflict: show diff, ask user to resolve
  5. Update .sync-state.json

mc sync watch (background daemon):
  1. chokidar watches local .mc/ for file changes → auto-push
  2. WebSocket listens for server changes → auto-pull
  3. Bidirectional, with conflict detection via version numbers
```

### 12.3 Conflict resolution

| Data type | Strategy | Reason |
|-----------|----------|--------|
| .meta.yaml fields | Last-write-wins | Simple fields, low conflict risk |
| Checklist items | Per-item last-write-wins | Individual row granularity |
| brief.md | Version check + manual merge | Long text, high conflict risk |
| decisions.md | Append-only, no conflict | Each decision is a new entry |
| Comments | No conflict | Each comment is independent |
| Assignments | Last-write-wins | Admin authority |

---

## 13. Deployment configurations

### 13.1 Solo mode
```bash
npm install -g @mission-control/cli
mc init
mc dashboard  # → localhost:4200
```
No server, no auth, SQLite + local files. All features except collaboration.

### 13.2 Team mode
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    volumes: [mc-data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: mission_control
      POSTGRES_USER: mc
      POSTGRES_PASSWORD: ${MC_DB_PASSWORD}

  api:
    image: ghcr.io/mission-control/server:latest
    ports: ["4200:4200"]
    environment:
      DATABASE_URL: postgres://mc:${MC_DB_PASSWORD}@db/mission_control
      JWT_SECRET: ${MC_JWT_SECRET}
      CORS_ORIGIN: ${MC_WEB_URL}
    depends_on: [db]

  web:
    image: ghcr.io/mission-control/dashboard:latest
    ports: ["3000:3000"]
    environment:
      API_URL: http://api:4200
    depends_on: [api]

volumes:
  mc-data:
```

```bash
docker compose up -d
# → Dashboard at http://your-server:3000
# → API at http://your-server:4200
# → First user becomes admin
```

### 13.3 Migration path
```bash
# Solo → Team: export local data into Postgres
mc export-db --format postgres --output dump.sql
psql mission_control < dump.sql
# All briefs, decisions, checklists, reviews preserved
# Invite team members via Dashboard

# Team → Cloud (future):
mc migrate --target cloud --org your-org
# Upload Postgres dump, map users to SSO
```
