# Mission Control Backend Architecture

## Overview

Mission Control is a FastAPI-based backend service that manages task briefs, sprints, reviews, and notifications for an AI-assisted task management system.

## Tech Stack

- **FastAPI** - Async web framework
- **SQLModel** - ORM combining SQLAlchemy + Pydantic
- **SQLite** (via `aiosqlite`) - Async database
- **watchfiles** - High-performance file monitoring
- **uv** - Package management

## Project Structure

```
backend/
├── src/mission_control/
│   ├── api/
│   │   ├── routes/          # API endpoint handlers
│   │   ├── schemas.py       # Pydantic request/response models
│   │   └── deps.py          # Dependency injection
│   ├── domain/
│   │   ├── models.py        # Domain entities
│   │   └── enums.py         # Status enumerations
│   ├── services/            # Business logic layer
│   │   ├── brief_service.py
│   │   ├── sprint_service.py
│   │   ├── plan_service.py
│   │   ├── contact_service.py
│   │   ├── notification_service.py
│   │   └── folder_service.py
│   ├── repositories/        # Data access layer
│   │   ├── brief_repo.py
│   │   ├── sprint_repo.py
│   │   ├── review_repo.py
│   │   └── link_repo.py
│   ├── adapters/             # External system adapters
│   │   └── filesystem.py    # File system operations
│   ├── usecases/            # Complex business workflows
│   │   ├── export_context.py
│   │   └── detect_links.py
│   ├── db/
│   │   ├── models.py         # Database models
│   │   └── session.py        # Database configuration
│   ├── config.py            # Application settings
│   └── main.py              # FastAPI app factory
├── tests/
│   ├── integration/          # API integration tests
│   └── unit/                 # Unit tests
└── scripts/                 # Utility scripts
```

## API Endpoints

### Health
- `GET /api/health` - Health check

### Briefs (`/api/briefs`)
- `GET /api/briefs` - List briefs with optional filters (sprint, folder, tag, status)
- `GET /api/briefs/stats` - Dashboard statistics
- `GET /api/briefs/focus` - Focus items (in-progress briefs)
- `GET /api/briefs/{path}` - Get brief details by path
- `POST /api/briefs` - Create a new brief
- `PUT /api/briefs/{path}` - Update a brief
- `DELETE /api/briefs/{path}` - Delete a brief
- `PUT /api/briefs/{path}/checklist` - Update checklist
- `POST /api/briefs/{path}/decisions` - Add decision
- `PUT /api/briefs/{path}/relations` - Update relations
- `POST /api/briefs/{path}/export` - Export context
- `POST /api/briefs/{path}/export-content` - Export content
- `POST /api/briefs/rebuild-index` - Rebuild search index
- `GET /api/briefs/{path}/subtasks` - Get subtasks

### Sprints (`/api/sprints`)
- `GET /api/sprints` - List sprints
- `POST /api/sprints` - Create sprint
- `PUT /api/sprints/{id}` - Update sprint
- `POST /api/sprints/{id}/sync-jira` - Sync from Jira
- `GET /api/sprints/{id}/progress` - Sprint progress
- `GET /api/sprints/{id}/summary` - Sprint summary

### Plan (`/api/plan`)
- `GET /api/plan/{sprint}` - Get plan
- `PUT /api/plan/{sprint}` - Update plan
- `POST /api/plan/{sprint}/rebalance` - Rebalance plan
- `POST /api/plan/{sprint}/daily-summary` - Generate daily summary
- `POST /api/plan/{sprint}/disruption` - Handle disruption

### Review (`/api/review`)
- `GET /api/review` - List reviews
- `POST /api/review` - Create review
- `GET /api/review/{id}` - Get review
- `PUT /api/review/{id}/feedback` - Submit feedback
- `DELETE /api/review/{id}` - Delete review

### Search (`/api`)
- `GET /api/search` - Search briefs
- `GET /api/graph` - Get dependency graph
- `GET /api/links` - Get links for a path
- `PUT /api/links/{id}/confirm` - Confirm link
- `PUT /api/links/{id}/dismiss` - Dismiss link
- `POST /api/links/detect` - Detect links

### Folders (`/api/folders`)
- `GET /api/folders` - Get folder tree
- `POST /api/folders` - Create folder
- `PUT /api/folders/{path}` - Update folder
- `DELETE /api/folders/{path}` - Delete folder
- `PUT /api/folders/{path}/move` - Move folder

### Contacts (`/api/contacts`)
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/{contact_id}` - Update contact
- `DELETE /api/contacts/{contact_id}` - Delete contact
- `POST /api/contacts/import/jira` - Import from Jira
- `POST /api/contacts/import/slack` - Import from Slack

### Notifications (`/api/notifications`)
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/{id}/read` - Mark as read
- `POST /api/notifications/webhook` - Slack webhook
- `POST /api/notifications/send` - Send notification
- `PUT /api/notifications/read-all` - Mark all as read

### Auth (`/api/auth`)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/invite` - Send invite
- `GET /api/auth/me` - Get current user

## Data Models

### Brief
Core task representation with:
- `id` - Unique identifier
- `folder_path` - File system path
- `title` - Brief title
- `status` - Current status (drafting, in_progress, review, done, blocked)
- `sprint_name` / `folder_name` - Hierarchy
- `goal`, `technical_details`, `constraints` - Content
- `decisions` - Recorded decisions
- `tags`, `extracted_tags` - Categorization
- `checklist_total`, `checklist_done` - Progress tracking
- `relations` - Links to other briefs

### Sprint
- `id`, `name`, `start_date`, `end_date`, `status`

### ReviewItem
- `id`, `brief_path`, `agent_tool`, `status`
- `diff_summary`, `files_changed`, `intent_checks`
- `feedback`, `submitted_at`, `reviewed_at`

## Key Design Decisions

### 1. Async Throughout
All database and file system operations are async to handle concurrent requests efficiently.

### 2. Repository Pattern
Data access is abstracted through repositories (`BriefRepoAsyncSQLite`, etc.) enabling:
- Easy testing with mock implementations
- Potential for swapping storage backends
- Clean separation of concerns

### 3. Service Layer
Business logic resides in services that orchestrate repositories and domain models:
- `BriefService` - Brief CRUD and file system sync
- `SprintService` - Sprint management
- `PlanService` - Planning operations

### 4. File System as Source of Truth
Briefs are stored as markdown files with `.meta.yaml` for metadata. The database index is rebuilt from the file system, ensuring durability and easy debugging.

### 5. Consistent Error Handling
All routes use `HTTPException` with consistent error codes:
- `404` - Resource not found
- `400` - Bad request / validation error
- `422` - Pydantic validation error
- `500` - Internal server error

### 6. Dependency Injection
FastAPI's `Depends()` is used throughout for:
- Service instantiation
- Database sessions
- Configuration access

## Testing Strategy

- **Unit tests** (`tests/unit/`) - Domain models, services with mocked repositories
- **Integration tests** (`tests/integration/`) - Full API endpoint testing via `httpx.AsyncClient`
- **conftest.py** provides fixtures for clean database state between tests

## Configuration

Environment variables:
- `DEBUG` - Enable debug mode
- `MC_ROOT` - Root directory for task files (default: `.mc`)
- `DATABASE_URL` - SQLite database URL
- `CORS_ORIGINS` - Allowed CORS origins