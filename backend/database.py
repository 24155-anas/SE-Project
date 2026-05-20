"""
Async SQLAlchemy engine and session factory for PostgreSQL.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from backend.config import settings

# ── Engine ──────────────────────────────────────────────────────────────────
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
)

# ── Session factory ─────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Declarative base ───────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency ──────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── Table creation ──────────────────────────────────────────────────────────
async def create_tables() -> None:
    """Create all ORM tables if they don't exist."""
    async with engine.begin() as conn:
        from backend.models import Base as _  # noqa: F401 — ensure models are imported
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed hubs after creation
    await seed_hubs()


async def seed_hubs() -> None:
    """Populate default location hubs if empty."""
    from backend.models import LocationHub
    from sqlalchemy import select

    hubs = [
        {"name": "ITU (Information Technology University)", "lat": 31.5204, "lng": 74.3587, "description": "Arfa Software Technology Park, Lahore"},
        {"name": "FAST-NUCES", "lat": 31.4826, "lng": 74.3051, "description": "Faisal Town, Lahore"},
        {"name": "LUMS", "lat": 31.4707, "lng": 74.4098, "description": "DHA Phase 5, Lahore"},
        {"name": "Model Town Park", "lat": 31.4870, "lng": 74.3360, "description": "Model Town, Lahore"},
        {"name": "Emporium Mall", "lat": 31.4682, "lng": 74.2741, "description": "Johar Town, Lahore"},
        {"name": "Liberty Market", "lat": 31.5117, "lng": 74.3436, "description": "Gulberg III, Lahore"},
        {"name": "UET Lahore", "lat": 31.5798, "lng": 74.3562, "description": "GT Road, Lahore"},
    ]

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(LocationHub).limit(1))
        if result.scalar_one_or_none():
            return

        for hub_data in hubs:
            db.add(LocationHub(**hub_data))
        await db.commit()
