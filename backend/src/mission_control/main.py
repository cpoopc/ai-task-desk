import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mission_control.config import get_settings
from mission_control.db.session import init_db
from mission_control.api.routes import briefs, folders, sprints, review, plan, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    await init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(briefs.router)
    app.include_router(folders.router)
    app.include_router(sprints.router)
    app.include_router(review.router)
    app.include_router(plan.router)
    app.include_router(search.router)

    @app.get("/api/health")
    async def health_check():
        return {"status": "healthy"}

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mission_control.main:app", reload=True)
