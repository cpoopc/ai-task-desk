from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Mission Control API"
    debug: bool = False

    mc_root: Path = Path(".mc")
    database_url: str = "sqlite+aiosqlite:///./.mc/.cache/index.db"

    watch_poll_interval: float = 1.0
    watch_recursive: bool = True

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    jira_url: str | None = None
    jira_username: str | None = None
    jira_api_token: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
