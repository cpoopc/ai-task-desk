# Mission Control Backend

Python FastAPI 后端服务，用于 Mission Control 任务管理系统的数据同步和 API 支撑。

## 技术栈

- **FastAPI** - 异步 Web 框架
- **SQLModel** - ORM (SQLAlchemy + Pydantic)
- **watchfiles** - Rust 实现的高性能文件监控
- **uv** - Python 包管理

## 快速开始

```bash
# 安装依赖
cd backend
uv sync

# 初始化数据库
uv run python -m mission_control.scripts.init_db

# 启动开发服务器
uv run uvicorn mission_control.main:app --reload --port 8000

# 运行测试
uv run pytest
```

## 项目结构

```
backend/
├── src/mission_control/
│   ├── domain/          # 领域模型 (Pydantic)
│   ├── adapters/        # 外部适配器 (文件系统、监控)
│   ├── repositories/    # 存储抽象层
│   ├── services/        # 业务逻辑层
│   ├── usecases/        # 复杂流程编排
│   ├── api/             # HTTP 接口层
│   └── db/              # 数据库层
├── tests/               # 测试
└── scripts/             # 工具脚本
```

## 环境变量

```bash
DEBUG=true
MC_ROOT=.mc
DATABASE_URL=sqlite+aiosqlite:///./.mc/.cache/index.db
CORS_ORIGINS=http://localhost:5173
```

## API 文档

启动服务后访问: http://localhost:8000/docs
