"""
Reset Database — drops ALL tables (including from old projects) and recreates
the Milaap schema from ORM models.

Usage:  python -m backend.reset_db
"""

import asyncio

from sqlalchemy import text

from backend.database import Base, engine


async def reset():
    # Import models so they register with Base.metadata
    import backend.models  # noqa: F401

    async with engine.begin() as conn:
        print("🗑  Dropping ALL tables (cascade) …")
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        print("🔨 Creating Milaap tables …")
        await conn.run_sync(Base.metadata.create_all)

    from backend.database import seed_hubs
    await seed_hubs()

    await engine.dispose()
    print("✅ Database reset complete!")


if __name__ == "__main__":
    asyncio.run(reset())
