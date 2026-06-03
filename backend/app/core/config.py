from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — async driver for the app, sync driver derived for Alembic.
    DATABASE_URL: str = (
        "postgresql+asyncpg://monoclip:monoclip@localhost:5432/monoclip"
    )

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    STATE_TOKEN_EXPIRE_MINUTES: int = 10

    # OAuth — Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # OAuth — GitHub
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # Public base URL of THIS backend, used to build OAuth redirect_uri.
    OAUTH_REDIRECT_BASE: str = "http://127.0.0.1:8000"

    # Custom protocol the desktop app registers; the callback hands the token here.
    APP_DEEP_LINK: str = "monoclip://auth"

    @property
    def sync_database_url(self) -> str:
        """Sync SQLAlchemy URL (psycopg/psycopg2) used by Alembic migrations."""
        return self.DATABASE_URL.replace("+asyncpg", "")

    def redirect_uri(self, provider: str) -> str:
        return f"{self.OAUTH_REDIRECT_BASE}/auth/{provider}/callback"


@lru_cache
def get_settings() -> Settings:
    return Settings()
