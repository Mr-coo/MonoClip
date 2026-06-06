from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_JWT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database — async driver for the app, sync driver derived for Alembic.
    DATABASE_URL: str = (
        "postgresql+asyncpg://monoclip:monoclip@localhost:5432/monoclip"
    )

    # JWT
    JWT_SECRET: str = INSECURE_JWT_SECRET
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    STATE_TOKEN_EXPIRE_MINUTES: int = 10

    # One-time code used to hand the JWT to the desktop app after OAuth.
    OAUTH_CODE_EXPIRE_SECONDS: int = 120

    # Login/registration abuse protection (per client IP + email).
    LOGIN_RATE_LIMIT: int = 10
    LOGIN_RATE_WINDOW_SECONDS: int = 300

    # Browser origins allowed to call the API (the Tauri webview + dev server).
    # App→backend traffic goes through the Tauri HTTP plugin (reqwest) and is not
    # subject to CORS; this list only gates real browser/WebView fetches.
    CORS_ALLOW_ORIGINS: list[str] = [
        "http://localhost:1420",
        "http://tauri.localhost",
        "tauri://localhost",
    ]

    @field_validator("JWT_SECRET")
    @classmethod
    def _reject_insecure_secret(cls, value: str) -> str:
        if not value or value == INSECURE_JWT_SECRET:
            raise ValueError(
                "JWT_SECRET is unset or still the placeholder. Set a strong random "
                'value, e.g. python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return value

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

    # --- Email (Gmail SMTP) for signup verification codes ---
    # Use a Gmail App Password (Google Account > Security > 2-Step Verification >
    # App passwords), NOT your normal account password. Port 587 = STARTTLS,
    # port 465 = implicit SSL. When unset, codes are logged instead of emailed
    # so the flow still works in local development.
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""  # full Gmail address, e.g. you@gmail.com
    SMTP_PASSWORD: str = ""  # 16-char Gmail App Password
    EMAIL_FROM: str = ""  # falls back to SMTP_USER when blank
    EMAIL_FROM_NAME: str = "MonoClip"

    # Signup email-verification one-time code.
    OTP_LENGTH: int = 6
    OTP_EXPIRE_SECONDS: int = 600  # 10 minutes
    OTP_MAX_ATTEMPTS: int = 5

    @property
    def sync_database_url(self) -> str:
        """Sync SQLAlchemy URL (psycopg/psycopg2) used by Alembic migrations."""
        return self.DATABASE_URL.replace("+asyncpg", "")

    def redirect_uri(self, provider: str) -> str:
        return f"{self.OAUTH_REDIRECT_BASE}/auth/{provider}/callback"

    @property
    def email_sender(self) -> str:
        """The From address for outbound mail (EMAIL_FROM, or SMTP_USER)."""
        return self.EMAIL_FROM or self.SMTP_USER


@lru_cache
def get_settings() -> Settings:
    return Settings()
