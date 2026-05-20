"""
Admin Router — CRUD operations and cross-service synchronization.
"""

import logging
from uuid import UUID
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, status

from backend.database import get_db
from backend.models import User, Report, Match, LocationHub
from backend.routers.auth import get_current_user
from backend.services import qdrant_service
# Note: Vercel Blob cleanup would require a list-blobs implementation or keeping track of all blobs.
# For now we focus on DB and Qdrant consistency.

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

async def check_admin(current_user: User = Depends(get_current_user)):
    """Dependency to ensure the user is an admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@router.get("/stats", dependencies=[Depends(check_admin)])
async def get_admin_stats(db: AsyncSession = Depends(get_db)):
    """Get system-wide stats."""
    user_count = await db.execute(select(func.count(User.id)))
    report_count = await db.execute(select(func.count(Report.id)))
    match_count = await db.execute(select(func.count(Match.id)))
    hub_count = await db.execute(select(func.count(LocationHub.id)))

    return {
        "users": user_count.scalar(),
        "reports": report_count.scalar(),
        "matches": match_count.scalar(),
        "hubs": hub_count.scalar(),
    }

@router.get("/reports", dependencies=[Depends(check_admin)])
async def list_all_reports(db: AsyncSession = Depends(get_db)):
    """List all reports for management."""
    result = await db.execute(select(Report).order_by(Report.created_at.desc()))
    return result.scalars().all()

@router.delete("/reports/{report_id}", dependencies=[Depends(check_admin)])
async def delete_report_cascading(report_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a report from DB and Qdrant."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # 1. Delete from Qdrant
    if report.qdrant_id:
        try:
            await qdrant_service.client.delete(
                collection_name=qdrant_service.COLLECTION_NAME,
                points_selector=[report.qdrant_id]
            )
        except Exception as e:
            logger.error(f"Failed to delete from Qdrant: {e}")

    # 2. Delete from DB (cascades to matches if configured, otherwise manual delete needed)
    # Since Match has FK to Report, we delete matches first
    await db.execute(delete(Match).where((Match.lost_report_id == report_id) | (Match.found_report_id == report_id)))
    await db.delete(report)
    await db.commit()

    return {"detail": "Report and associated data deleted successfully"}

@router.get("/hubs")
async def list_hubs(db: AsyncSession = Depends(get_db)):
    """Public endpoint to list location hubs for the map and forms."""
    result = await db.execute(select(LocationHub).order_by(LocationHub.name))
    return result.scalars().all()
