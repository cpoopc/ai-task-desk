# Mission Control 后端设计文档

> 版本: 1.0  
> 日期: 2026-04-17  
> 技术栈: Python + FastAPI + SQLModel + watchfiles

---

## 1. 概述

基于 [技术设计文档 v2](../Mission_Control_Tech_Design_v2.md) 实现后端服务，采用 Python 技术栈替代原设计的 Node.js。

### 1.1 核心目标

- 实现完整的 REST API，支撑前端 Dashboard
- 文件系统与 SQLite 的同步机制（双向）
- 文件监控自动同步（watchfiles）
- 可插拔的存储层，支持未来 PostgreSQL 迁移

### 1.2 技术选型

| 组件 | 技术 | 理由 |
|------|------|------|
| Web 框架 | FastAPI | 异步原生、类型安全、OpenAPI 自动生成 |
| ORM/模型 | SQLModel | FastAPI 作者作品，SQLAlchemy + Pydantic 结合 |
| 文件监控 | watchfiles | Rust 实现高性能，FastAPI 生态推荐 |
| 依赖管理 | uv | 快速、现代化 Python 包管理 |
| 数据库 | SQLite (初期) | 零配置、单文件，符合 local-first 理念 |

---

## 2. 项目结构

```
backend/
├── pyproject.toml              # uv 项目配置
├── uv.lock                     # 锁定依赖版本
├── README.md                   # 后端开发说明
│
├── src/
│   └── mission_control/
│       ├── __init__.py
│       ├── main.py              # FastAPI 应用入口
│       ├── config.py            # 配置管理 (Pydantic Settings)
│       │
│       ├── domain/              # 领域模型 (纯 Pydantic)
│       │   ├── models.py        # Brief, Task, Sprint 等实体
│       │   ├── enums.py         # 状态枚举
│       │   └── events.py        # 领域事件
│       │
│       ├── adapters/            # 外部适配器
│       │   ├── filesystem.py    # 文件系统操作 (.md/.yaml)
│       │   ├── watcher.py       # 文件监控 (watchfiles)
│       │   └── exporter.py      # 上下文导出 (.cursorrules)
│       │
│       ├── repositories/        # 存储抽象层
│       │   ├── base.py          # Repository 接口
│       │   ├── brief_repo.py    # Brief 存储实现
│       │   ├── review_repo.py   # Review 存储实现
│       │   └── link_repo.py     # 跨任务链接存储
│       │
│       ├── services/            # 业务逻辑层
│       │   ├── brief_service.py
│       │   ├── folder_service.py
│       │   ├── sprint_service.py
│       │   └── plan_service.py
│       │
│       ├── usecases/            # 复杂流程编排
│       │   ├── rebuild_index.py
│       │   ├── export_context.py
│       │   └── detect_links.py
│       │
│       ├── api/                 # HTTP 接口层
│       │   ├── deps.py          # 依赖注入
│       │   ├── errors.py        # 错误处理
│       │   ├── routes/
│       │   │   ├── briefs.py    # /api/briefs/*
│       │   │   ├── folders.py   # /api/folders/*
│       │   │   ├── sprints.py   # /api/sprints/*
│       │   │   ├── review.py    # /api/review/*
│       │   │   ├── plan.py      # /api/plan/*
│       │   │   └── search.py    # /api/search
│       │   └── schemas.py       # API 请求/响应模型
│       │
│       └── db/                  # 数据库层
│           ├── session.py       # SQLModel 会话管理
│           └── models.py        # SQLModel 表定义
│
├── tests/
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── fixtures/                # 测试数据
│
└── scripts/
    └── init_db.py               # 数据库初始化脚本
```

---

## 3. 核心架构

### 3.1 分层架构

```
┌──────────────────────────────────────────┐
│              API Layer                   │  FastAPI Routers
│         (Routes + Schemas)               │  HTTP/JSON
├──────────────────────────────────────────┤
│           Service Layer                  │  Use Cases
│      (Business Logic + Orchestration)    │  业务流程编排
├──────────────────────────────────────────┤
│          Repository Layer                │  存储抽象接口
│        (BriefRepository, etc.)           │  屏蔽底层实现
├──────────────────────────────────────────┤
│           Storage Layer                  │  具体实现
│   FileSystem (.mc/*) │  SQLite (SQLModel)│  可替换
└──────────────────────────────────────────┘
```

### 3.2 Repository 抽象设计

```python
# repositories/base.py
from typing import Protocol, TypeVar, Generic
from domain.models import Brief, BriefFilters

T = TypeVar('T')

class Repository(Protocol, Generic[T]):
    async def get(self, id: str) -> T | None: ...
    async def list(self, **filters) -> list[T]: ...
    async def save(self, entity: T) -> T: ...
    async def delete(self, id: str) -> None: ...

class BriefRepository(Protocol):
    # 基础 CRUD
    async def get(self, id: str) -> Brief | None: ...
    async def list(self, filters: BriefFilters) -> list[Brief]: ...
    async def save(self, brief: Brief) -> Brief: ...
    async def delete(self, id: str) -> None: ...
    
    # 索引操作
    async def rebuild_index(self, briefs: list[Brief]) -> None: ...
    async def update_from_filesystem(self, path: str) -> None: ...
    
    # 查询
    async def get_by_path(self, path: str) -> Brief | None: ...
    async def get_children(self, parent_path: str) -> list[Brief]: ...
    async def search(self, query: str) -> list[Brief]: ...

class ReviewRepository(Protocol):
    async def create(self, review: ReviewItem) -> ReviewItem: ...
    async def get_pending(self) -> list[ReviewItem]: ...
    async def update_feedback(self, id: str, feedback: Feedback) -> ReviewItem: ...

class LinkRepository(Protocol):
    async def find_links(self, source_path: str) -> list[CrossTaskLink]: ...
    async def create_link(self, link: CrossTaskLink) -> CrossTaskLink: ...
    async def confirm_link(self, id: str) -> CrossTaskLink: ...
    async def dismiss_link(self, id: str) -> None: ...
```

### 3.3 存储切换策略

为满足"后续可能切换 PostgreSQL"的需求，Repository 层完全接口化：

```python
# config.py
class Settings(BaseSettings):
    database_url: str = "sqlite:///./.mc/.cache/index.db"
    
# repositories/__init__.py
def get_brief_repository() -> BriefRepository:
    if "postgresql" in settings.database_url:
        from .postgresql import BriefRepoPostgreSQL
        return BriefRepoPostgreSQL()
    from .sqlite import BriefRepoSQLite
    return BriefRepoSQLite()

# 依赖注入
async def brief_service() -> BriefService:
    repo = get_brief_repository()
    fs = FileSystemAdapter()
    return BriefService(repo, fs)
```

**初期实现：** 仅实现 SQLite 版本，但接口设计兼容 PostgreSQL。

---

## 4. 数据模型

### 4.1 领域模型 (Pydantic)

```python
# domain/models.py
from pydantic import BaseModel, Field
from datetime import datetime
from domain.enums import Status, ReviewStatus

class Brief(BaseModel):
    """任务 Brief 领域模型"""
    id: str = Field(..., description="唯一标识")
    folder_path: str = Field(..., description="文件夹路径")
    title: str
    status: Status = Status.drafting
    current_step: int = 0
    total_steps: int = 0
    assigned_tool: str | None = None
    sprint_name: str | None = None
    folder_name: str | None = None
    parent_task_path: str | None = None
    
    # 内容
    goal: str = ""
    technical_details: str = ""
    constraints: list[str] = Field(default_factory=list)
    decisions: list[Decision] = Field(default_factory=list)
    
    # 元数据
    tags: list[str] = Field(default_factory=list)
    extracted_tags: list[str] = Field(default_factory=list)
    jira_key: str | None = None
    
    # 统计
    checklist_total: int = 0
    checklist_done: int = 0
    
    # 时间
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: datetime | None = None
    indexed_at: datetime | None = None

class ReviewItem(BaseModel):
    """审查项"""
    id: str
    brief_path: str
    agent_tool: str
    status: ReviewStatus = ReviewStatus.pending
    diff_summary: str
    files_changed: list[FileChange]
    intent_checks: list[IntentCheck]
    feedback: Feedback | None = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: datetime | None = None

class CrossTaskLink(BaseModel):
    """跨任务链接"""
    id: str
    source_path: str
    target_path: str
    link_type: LinkType = LinkType.suggested
    match_method: str  # "rule" | "semantic"
    score: float
    matched_tags: list[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: datetime | None = None
```

### 4.2 数据库模型 (SQLModel)

完全映射设计文档 Section 3 的 schema：

```python
# db/models.py
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import JSON, Text, Index
from datetime import datetime
import uuid

class BriefIndex(SQLModel, table=True):
    """Brief 索引表 - 从文件系统镜像"""
    __tablename__ = "briefs_index"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    folder_path: str = Field(..., unique=True, index=True)
    title: str | None = None
    status: str = "drafting"
    current_step: int = 0
    total_steps: int = 0
    assigned_tool: str | None = None
    sprint_name: str | None = Field(default=None, index=True)
    folder_name: str | None = Field(default=None, index=True)
    parent_task_path: str | None = Field(default=None, index=True)
    user_tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    extracted_tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    checklist_total: int = 0
    checklist_done: int = 0
    is_hidden: bool = False
    jira_key: str | None = None
    last_activity: str | None = None
    last_active_at: datetime | None = None
    indexed_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewItemDB(SQLModel, table=True):
    """机器生成的审查队列"""
    __tablename__ = "review_items"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    brief_path: str = Field(..., index=True)
    agent_tool: str | None = None
    status: str = "pending"
    diff_summary: str | None = None
    files_changed: list = Field(default_factory=list, sa_column=Column(JSON))
    intent_checks: list = Field(default_factory=list, sa_column=Column(JSON))
    feedback: dict | None = Field(default=None, sa_column=Column(JSON))
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: datetime | None = None

class CrossTaskLinkDB(SQLModel, table=True):
    """机器生成的跨任务链接"""
    __tablename__ = "cross_task_links"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    source_path: str = Field(..., index=True)
    target_path: str = Field(..., index=True)
    link_type: str = "suggested"
    match_method: str | None = None
    score: float = 0.0
    matched_tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    confirmed_at: datetime | None = None

class TimelineEventDB(SQLModel, table=True):
    """时间线事件"""
    __tablename__ = "timeline_events"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    brief_path: str = Field(..., index=True)
    event_type: str
    title: str
    detail: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class NotificationDB(SQLModel, table=True):
    """通知"""
    __tablename__ = "notifications"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    target_path: str = Field(..., index=True)
    source_path: str
    change_description: str
    status: str = "unread"
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### 4.3 文件系统模型

```python
# adapters/filesystem.py
from pathlib import Path
from dataclasses import dataclass
from typing import Literal

@dataclass
class TaskFolder:
    """任务文件夹表示"""
    path: Path
    brief: BriefContent | None
    checklist: ChecklistContent | None
    decisions: DecisionsContent | None
    meta: MetaContent | None
    subtasks: list["TaskFolder"]

@dataclass
class BriefContent:
    title: str
    goal: str
    technical_details: str
    constraints: list[str]

@dataclass
class ChecklistItem:
    text: str
    status: Literal["todo", "done"] = "todo"
    metadata: dict | None = None  # HTML 注释解析的元数据

@dataclass
class ChecklistContent:
    items: list[ChecklistItem]

@dataclass  
class DecisionsContent:
    decisions: list[str]

@dataclass
class MetaContent:
    """.meta.yaml 内容"""
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
```

---

## 5. 核心流程

### 5.1 创建任务流程

```
POST /api/briefs
│
├─> BriefService.create_from_template(template_type, sprint, folder, name)
│   │
│   ├─> FileSystemAdapter.create_task_folder(path, template)
│   │   ├─> mkdir -p "Sprint 24/Backend/AIR deprovisioning"
│   │   ├─> 从 _templates/{template_type}/ 复制文件
│   │   └─> 渲染 brief.md, checklist.md 模板
│   │
│   └─> BriefRepository.save(brief)  # 写入索引
│
└─> 返回 201 + brief.id
```

### 5.2 文件变更同步流程

```
FileSystem Event (watchfiles)
│
├─> FileWatcher.on_change(path)
│   ├─> 解析变更类型 (create/modify/delete/move)
│   ├─> 如果是任务文件夹内容变更
│   │   ├─> FileSystemAdapter.parse_task(path)
│   │   │   ├─> 读取 brief.md, checklist.md, .meta.yaml
│   │   │   └─> 返回 TaskFolder 对象
│   │   └─> BriefRepository.update_from_filesystem(brief)
│   │
│   ├─> 触发事件 (BriefUpdatedEvent)
│   │   └─> TimelineEventDB 记录时间线
│   │
│   └─> 可选: 重新计算跨任务链接
│
└─> WebSocket 推送 (如实现实时通知)
```

### 5.3 索引重建流程

```
POST /api/admin/rebuild-index
│
├─> RebuildIndexUseCase.execute()
│   │
│   ├─> FileSystemAdapter.walk_tasks(root=".mc/")
│   │   ├─> 递归遍历所有任务文件夹
│   │   ├─> 跳过 _resources, _templates, .hidden/
│   │   └─> 返回 list[TaskFolder]
│   │
│   ├─> 将 TaskFolder 转换为 Brief 领域模型
│   │
│   ├─> BriefRepository.rebuild_index(briefs)
│   │   ├─> 事务开始
│   │   ├─> 清除 briefs_index 表
│   │   ├─> 重建 briefs_fts 全文索引
│   │   ├─> 批量插入新数据
│   │   └─> 事务提交
│   │
│   └─> 重新运行跨任务链接检测
│       └─> LinkDetectionEngine.detect_all()
│
└─> 返回统计信息 (索引数量、耗时)
```

### 5.4 上下文导出流程

```
POST /api/briefs/:path/export
│
├─> ExportContextUseCase.execute(brief_path)
│   │
│   ├─> BriefRepository.get_by_path(path)
│   │
│   ├─> ContextExporter.export(brief)
│   │   ├─> 选择模板 (handlebars 风格)
│   │   ├─> 渲染 .cursorrules
│   │   ├─> 渲染 CLAUDE.md
│   │   └─> 渲染 AGENTS.md (如需要)
│   │
│   └─> FileSystemAdapter.write_context_files(rendered_files)
│       ├─> 写入项目根目录 .cursorrules
│       ├─> 写入 CLAUDE.md
│       └─> 更新 .gitignore (如需要)
│
└─> 返回导出文件列表
```

---

## 6. API 设计

与设计文档 Section 5 保持一致，使用 FastAPI 自动生成的 OpenAPI。

### 6.1 Dashboard & Briefs

```python
# api/routes/briefs.py
from fastapi import APIRouter, Depends
from api.schemas import BriefCreate, BriefUpdate, BriefResponse

router = APIRouter(prefix="/api/briefs", tags=["briefs"])

@router.get("", response_model=list[BriefResponse])
async def list_briefs(
    sprint: str | None = None,
    folder: str | None = None,
    tag: str | None = None,
    status: str | None = None,
    service: BriefService = Depends(get_brief_service)
):
    """列出 Briefs，支持过滤"""
    return await service.list(filters={...})

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    service: BriefService = Depends(get_brief_service)
):
    """Dashboard 统计卡片"""
    ...

@router.get("/focus", response_model=list[FocusItem])
async def get_focus_items(
    service: BriefService = Depends(get_brief_service)
):
    """焦点区域项目（按优先级排序）"""
    ...

@router.get("/{path:path}", response_model=BriefDetailResponse)
async def get_brief(
    path: str,
    service: BriefService = Depends(get_brief_service)
):
    """获取 Brief 详情"""
    ...

@router.post("", status_code=201)
async def create_brief(
    data: BriefCreate,
    service: BriefService = Depends(get_brief_service)
):
    """从模板创建 Brief"""
    ...

@router.put("/{path:path}")
async def update_brief(
    path: str,
    data: BriefUpdate,
    service: BriefService = Depends(get_brief_service)
):
    """更新 Brief 字段 -> 写入文件系统"""
    ...

@router.delete("/{path:path}")
async def delete_brief(path: str, ...):
    """删除任务文件夹"""
    ...

@router.put("/{path:path}/checklist")
async def update_checklist(path: str, items: list[ChecklistUpdate], ...):
    """更新 checklist -> 写入 checklist.md"""
    ...

@router.post("/{path:path}/decisions")
async def add_decision(path: str, decision: DecisionCreate, ...):
    """添加决策 -> 追加到 decisions.md"""
    ...

@router.post("/{path:path}/export")
async def export_context(path: str, ...):
    """生成上下文文件"""
    ...
```

### 6.2 Folders & Sprints

```python
# api/routes/folders.py
@router.get("/api/folders")
async def get_folder_tree() -> FolderTree: ...

@router.post("/api/folders")
async def create_folder(data: FolderCreate) -> Folder: ...

@router.put("/api/folders/{path:path}")
async def update_folder(path: str, data: FolderUpdate) -> Folder: ...

@router.delete("/api/folders/{path:path}")
async def delete_folder(path: str) -> None: ...

@router.put("/api/folders/{path:path}/move")
async def move_folder(path: str, target: str) -> Folder: ...
```

```python
# api/routes/sprints.py
@router.get("/api/sprints")
async def list_sprints() -> list[Sprint]: ...

@router.post("/api/sprints")
async def create_sprint(data: SprintCreate) -> Sprint: ...

@router.put("/api/sprints/{id}")
async def update_sprint(id: str, data: SprintUpdate) -> Sprint: ...

@router.post("/api/sprints/{id}/sync-jira")
async def sync_from_jira(id: str) -> SyncResult: ...
```

### 6.3 Plan

```python
# api/routes/plan.py
@router.get("/api/plan/{sprint}")
async def get_plan(sprint: str) -> Plan: ...

@router.put("/api/plan/{sprint}")
async def update_plan(sprint: str, data: PlanUpdate) -> Plan: ...

@router.post("/api/plan/{sprint}/rebalance")
async def rebalance_plan(sprint: str) -> Plan: ...

@router.post("/api/plan/{sprint}/daily-summary")
async def generate_daily_summary(sprint: str) -> DailySummary: ...
```

### 6.4 Review

```python
# api/routes/review.py
@router.get("/api/review")
async def list_reviews(status: str | None = None) -> list[ReviewItem]: ...

@router.post("/api/review")
async def create_review(data: ReviewCreate) -> ReviewItem: ...

@router.get("/api/review/{id}")
async def get_review(id: str) -> ReviewDetail: ...

@router.put("/api/review/{id}/feedback")
async def submit_feedback(id: str, feedback: Feedback) -> ReviewItem: ...
```

### 6.5 Links & Search

```python
# api/routes/links.py
@router.get("/api/links")
async def get_links(path: str) -> list[CrossTaskLink]: ...

@router.put("/api/links/{id}/confirm")
async def confirm_link(id: str) -> CrossTaskLink: ...

@router.put("/api/links/{id}/dismiss")
async def dismiss_link(id: str) -> None: ...

# api/routes/search.py
@router.get("/api/search")
async def search(q: str) -> list[SearchResult]: ...

@router.get("/api/graph")
async def get_dependency_graph(sprint: str | None = None) -> GraphData: ...
```

---

## 7. 文件监控设计

### 7.1 watchfiles 集成

```python
# adapters/watcher.py
import asyncio
from watchfiles import awatch, Change

class FileWatcher:
    def __init__(
        self,
        root_path: Path,
        brief_service: BriefService,
        on_change: Callable | None = None
    ):
        self.root_path = root_path
        self.brief_service = brief_service
        self.on_change = on_change
        self._stop_event = asyncio.Event()
    
    async def start(self):
        """启动文件监控"""
        async for changes in awatch(
            self.root_path,
            stop_event=self._stop_event,
            watch_filter=self._should_watch
        ):
            for change_type, path in changes:
                await self._handle_change(change_type, Path(path))
    
    def _should_watch(self, path: str) -> bool:
        """过滤不需要监控的文件"""
        # 忽略 .cache/, node_modules/, .git/ 等
        ignore_patterns = ['.cache/', '__pycache__/', '.git/', 'node_modules/']
        return not any(p in path for p in ignore_patterns)
    
    async def _handle_change(self, change_type: Change, path: Path):
        """处理文件变更"""
        # 识别是否为任务文件夹相关文件
        if self._is_task_file(path):
            task_path = self._extract_task_path(path)
            
            if change_type == Change.deleted:
                await self.brief_service.delete_from_index(task_path)
            else:
                # 新增或修改: 重新解析并更新索引
                brief = await self.brief_service.parse_from_filesystem(task_path)
                await self.brief_service.update_index(brief)
                
            # 触发时间线事件
            await self._record_timeline_event(change_type, task_path)
            
        # 触发回调 (WebSocket 推送等)
        if self.on_change:
            self.on_change(change_type, path)
    
    def stop(self):
        """停止监控"""
        self._stop_event.set()
```

### 7.2 与服务集成

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时
    settings = get_settings()
    
    # 初始化数据库
    await init_db(settings.database_url)
    
    # 启动文件监控
    watcher = FileWatcher(
        root_path=settings.mc_root,
        brief_service=app.state.brief_service
    )
    watcher_task = asyncio.create_task(watcher.start())
    app.state.watcher = watcher
    
    yield
    
    # 关闭时
    watcher.stop()
    await watcher_task

app = FastAPI(lifespan=lifespan)
```

---

## 8. 跨任务链接检测

### 8.1 标签提取引擎

```python
# usecases/detect_links.py
class TagExtractionEngine:
    """从 Brief 内容提取标签"""
    
    # 技术关键词映射
    TECH_KEYWORDS = {
        'caffeine': ['caffeine', 'cache'],
        'redis': ['redis'],
        'spring': ['spring', 'springboot', 'spring-boot'],
        'kafka': ['kafka'],
        'grpc': ['grpc', 'gRPC'],
        'postgres': ['postgres', 'postgresql'],
    }
    
    # 模式规则
    PATTERNS = {
        'caching': r'cache|LRU|TTL',
        'feature-flag': r'feature.?flag|launchdarkly',
        'circuit-breaker': r'circuit.?breaker|resilience4j',
    }
    
    def extract(self, brief: Brief) -> dict[str, list[str]]:
        """提取多维度标签"""
        text = f"{brief.title} {brief.goal} {brief.technical_details}"
        
        tags = {
            'technologies': self._match_keywords(text, self.TECH_KEYWORDS),
            'patterns': self._match_patterns(text, self.PATTERNS),
            'services': self._extract_services(brief),
            'conventions': self._extract_conventions(brief),
            'constraints': [c.lower().strip() for c in brief.constraints]
        }
        
        return tags
```

### 8.2 链接检测算法

```python
class LinkDetectionEngine:
    """跨任务链接检测"""
    
    # 权重配置
    WEIGHTS = {
        'conventions': 0.6,
        'patterns': 0.5,
        'services': 0.4,
        'technologies': 0.3,
        'constraints': 0.3
    }
    
    def detect_all(self, briefs: list[Brief]) -> list[CrossTaskLink]:
        """检测所有可能的链接"""
        # 预提取所有标签
        tags_map = {b.id: self.tag_engine.extract(b) for b in briefs}
        
        links = []
        for i, a in enumerate(briefs):
            for b in briefs[i+1:]:
                score, method, matched = self._calculate_similarity(
                    tags_map[a.id], tags_map[b.id]
                )
                
                if score >= 0.6:
                    links.append(CrossTaskLink(
                        link_type=LinkType.auto,
                        score=score,
                        matched_tags=matched
                    ))
                elif score >= 0.3:
                    links.append(CrossTaskLink(
                        link_type=LinkType.suggested,
                        score=score,
                        matched_tags=matched
                    ))
        
        return links
    
    def _calculate_similarity(
        self, 
        tags_a: dict, 
        tags_b: dict
    ) -> tuple[float, str, list[str]]:
        """计算加权 Jaccard 相似度"""
        total_score = 0.0
        total_weight = 0.0
        all_matches = []
        
        for category, weight in self.WEIGHTS.items():
            set_a = set(tags_a.get(category, []))
            set_b = set(tags_b.get(category, []))
            
            if not set_a and not set_b:
                continue
                
            intersection = set_a & set_b
            union = set_a | set_b
            
            jaccard = len(intersection) / len(union) if union else 0
            total_score += jaccard * weight
            total_weight += weight
            
            all_matches.extend(intersection)
        
        final_score = total_score / total_weight if total_weight else 0
        method = "rule"  # 或 "semantic" (如使用嵌入)
        
        return final_score, method, list(set(all_matches))
```

---

## 9. 配置管理

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # 应用
    app_name: str = "Mission Control API"
    debug: bool = False
    
    # 路径
    mc_root: Path = Path(".mc")
    database_url: str = "sqlite+aiosqlite:///./.mc/.cache/index.db"
    
    # 文件监控
    watch_poll_interval: float = 1.0
    watch_recursive: bool = True
    
    # 安全
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Jira (可选)
    jira_url: str | None = None
    jira_username: str | None = None
    jira_api_token: str | None = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

---

## 10. 测试策略

```
tests/
├── unit/
│   ├── test_models.py           # 领域模型测试
│   ├── test_tag_extraction.py   # 标签提取测试
│   └── test_link_detection.py   # 链接检测算法测试
│
├── integration/
│   ├── test_filesystem.py       # 文件系统适配器测试
│   ├── test_repositories.py     # Repository 测试
│   ├── test_api.py              # API 端点测试
│   └── test_watcher.py          # 文件监控测试
│
└── fixtures/
    ├── sample_task/             # 示例任务文件夹
    │   ├── brief.md
    │   ├── checklist.md
    │   ├── decisions.md
    │   └── .meta.yaml
    └── conftest.py              # pytest 配置
```

### 10.1 Repository 测试 (使用内存 SQLite)

```python
# tests/integration/test_repositories.py
import pytest
from sqlmodel import SQLModel, create_async_engine
from repositories.brief_repo import BriefRepoAsyncSQLite

@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    # ... yield session

async def test_brief_crud(db_session):
    repo = BriefRepoAsyncSQLite(db_session)
    
    brief = Brief(id="test-1", folder_path="Sprint1/Task1", title="Test")
    saved = await repo.save(brief)
    
    assert saved.id == "test-1"
    
    fetched = await repo.get("test-1")
    assert fetched.title == "Test"
```

---

## 11. 部署与开发

### 11.1 启动方式

```bash
# 开发模式
uv run uvicorn mission_control.main:app --reload

# 生产模式
uv run uvicorn mission_control.main:app --host 0.0.0.0 --port 8000

# 初始化数据库
uv run python -m mission_control.scripts.init_db

# 重建索引
uv run python -m mission_control.scripts.rebuild_index
```

### 11.2 环境变量

```
# .env
DEBUG=true
MC_ROOT=.mc
DATABASE_URL=sqlite+aiosqlite:///./.mc/.cache/index.db
CORS_ORIGINS=http://localhost:5173
```

---

## 12. 与设计文档的对应关系

| 设计文档章节 | 本设计对应 | 备注 |
|-------------|-----------|------|
| 3. SQLite Schema | `db/models.py` | 完全按 schema 实现 |
| 4. Data Flow | `usecases/`, `adapters/watcher.py` | 双向同步 |
| 5. REST API | `api/routes/` | 相同端点 |
| 6. Cross-task Detection | `usecases/detect_links.py` | 相同算法 |
| 7. AI Integration | `adapters/exporter.py` | 上下文导出 |
| 8. AI Task Planner | `services/plan_service.py` | 规划算法 |
| 9. Performance | Repository 层索引优化 | 目标相同 |

---

## 13. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SQLite 并发写入 | 中 | 使用 asyncio 锁，或提前设计 Repository 接口支持连接池 |
| 文件监控性能 | 低 | watchfiles 高性能，大项目可启用 debounce |
| Repository 抽象开销 | 低 | 接口简洁，初期只有一种实现 |
| 迁移 PostgreSQL 成本 | 低 | 完整的 Repository 抽象，SQLModel 本身支持 PostgreSQL |

---

## 14. 验收标准

- [ ] 完整的 REST API 实现（所有设计文档端点）
- [ ] 文件系统修改自动同步到数据库（watchfiles）
- [ ] API 修改写入文件系统（双向同步）
- [ ] 索引重建命令（<3s for 100 briefs）
- [ ] 模板创建任务
- [ ] 上下文导出（.cursorrules, CLAUDE.md）
- [ ] 跨任务链接检测
- [ ] 审查队列 CRUD
- [ ] 单元测试覆盖率 >70%
- [ ] 集成测试覆盖核心流程
