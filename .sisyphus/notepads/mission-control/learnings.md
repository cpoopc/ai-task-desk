# Mission Control - Learning & Decisions

## Phase 1 (Solo MVP) - Completed ✅

### What was built (2026-04-17)

| # | Feature | Files Changed |
|---|---------|---------------|
| 1 | 5 Checklist Templates | backend/src/mission_control/adapters/_templates/*/ |
| 2 | Context Export API | exporter.py, export_context.py, briefs.py |
| 3 | Dashboard Focus Area | TaskContext.tsx, Dashboard.tsx |
| 4 | Review Queue Frontend | ReviewQueue.tsx |
| 5 | Folder CRUD + Drag-drop | TaskContext.tsx, App.tsx, FolderModal.tsx |
| 6 | Sprint Selector + Progress | schemas.py, sprint_service.py, App.tsx |
| 7 | Search + Filter | App.tsx |
| 8 | Tag Filter | Dashboard.tsx |
| 9 | Session Restore | TaskDetail.tsx |

### Phase 1 Remaining Items (Nice to have)

- [ ] Checklist items drag-drop reordering
- [ ] Decisions log UI (add/edit/delete decisions)
- [ ] .meta.yaml editor (tags, relations, Jira key)
- [ ] Mock data generator for demo/testing
- [ ] Phase 2-5 items in checklist templates

## Phase 2 (Review & Relationships) - In Progress

### Goals
- Review Queue backend enhancement
- Task Relations (blocks/depends-on/related-to)
- Sub-task Support
- Task Graph Visualization
- Git Hook Integration

## Key Decisions

1. **Template System**: Templates stored in `_templates/{type}/checklist.md`, loaded dynamically
2. **Context Export**: Returns content dict, frontend copies to clipboard
3. **Folder ID = Path**: Folder id is actually the filesystem path
4. **Sprint end_date**: Added to support sprint duration tracking
