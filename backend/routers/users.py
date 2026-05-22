"""
Users Router — Dashboard stats and recent activity.
"""

import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends

from backend.database import get_db
from backend.models import Report, Match, User, ClaimAttempt
from backend.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me/dashboard")
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get summary stats and recent activity for the dashboard.
    """
    # 1. Quick Stats
    lost_count_r = await db.execute(
        select(func.count(Report.id)).where(
            Report.user_id == current_user.id, 
            Report.report_type == "lost"
        )
    )
    lost_count = lost_count_r.scalar() or 0

    found_count_r = await db.execute(
        select(func.count(Report.id)).where(
            Report.user_id == current_user.id, 
            Report.report_type == "found"
        )
    )
    found_count = found_count_r.scalar() or 0

    # Pending matches (notified or claimed) involving user's reports
    user_reports_subquery = select(Report.id).where(Report.user_id == current_user.id)
    pending_matches_r = await db.execute(
        select(func.count(Match.id)).where(
            or_(
                Match.lost_report_id.in_(user_reports_subquery),
                Match.found_report_id.in_(user_reports_subquery)
            ),
            Match.status.in_(["notified", "claimed"])
        )
    )
    pending_matches = pending_matches_r.scalar() or 0

    resolved_matches_r = await db.execute(
        select(func.count(Match.id)).where(
            or_(
                Match.lost_report_id.in_(user_reports_subquery),
                Match.found_report_id.in_(user_reports_subquery)
            ),
            Match.status == "resolved"
        )
    )
    resolved_matches = resolved_matches_r.scalar() or 0

    # 2. Recent Activity (Mocked/Simplified for now, could be improved with an Activity table)
    # We'll pull recent matches and report creations
    activities = []
    
    # Recent Matches
    recent_matches_r = await db.execute(
        select(Match).where(
            or_(
                Match.lost_report_id.in_(user_reports_subquery),
                Match.found_report_id.in_(user_reports_subquery)
            )
        ).order_by(Match.created_at.desc()).limit(5)
    )
    for m in recent_matches_r.scalars().all():
        activities.append({
            "type": "match",
            "title": f"New match found - {m.similarity_score*100:.0f}% similarity",
            "status": m.status,
            "timestamp": m.created_at,
            "id": str(m.id)
        })

    # Recent Reports
    recent_reports_r = await db.execute(
        select(Report).where(Report.user_id == current_user.id).order_by(Report.created_at.desc()).limit(5)
    )
    for r in recent_reports_r.scalars().all():
        activities.append({
            "type": "report",
            "title": f"You reported: {r.report_type} {r.category}",
            "status": r.status,
            "timestamp": r.created_at,
            "id": str(r.id)
        })

    # Sort combined activities by timestamp
    activities.sort(key=lambda x: x["timestamp"], reverse=True)

    return {
        "user": {
            "id": str(current_user.id),
            "name": current_user.name or current_user.email.split("@")[0],
            "email": current_user.email,
            "is_admin": current_user.is_admin
        },
        "stats": {
            "lost_reports": lost_count,
            "found_reports": found_count,
            "pending_matches": pending_matches,
            "resolved_matches": resolved_matches
        },
        "recent_activity": activities[:5]
    }
