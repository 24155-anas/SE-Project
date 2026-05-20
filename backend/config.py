"""
Milaap Configuration — loads environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── PostgreSQL ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/milaap"

    # ── Qdrant Cloud ────────────────────────────────────────────────────────
    QDRANT_URL: str
    QDRANT_API_KEY: str

    # ── Vercel Blob ─────────────────────────────────────────────────────────
    VERCEL_BLOB_READ_WRITE_TOKEN: str

    # ── JWT ─────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── Resend Email ────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""


settings = Settings()
