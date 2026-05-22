"""
Matching service — creates and manages matches between reports.

Sends in-app Notification records instead of emails.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Match, Notification, Report, User

logger = logging.getLogger(__name__)


async def create_matches_from_search(
    db: AsyncSession,
    new_report: Report,
    search_results: list[dict],
    threshold: float = 0.70,
):
    """
    Create Match records for all search results above threshold.
    Creates in-app Notification records for both parties (no emails).
    """
    matches_created = []

    for result in search_results:
        if result["score"] < threshold:
            continue

        matching_report_id = UUID(result["report_id"])

        # Determine lost vs found
        if new_report.report_type in ("lost", "person_missing"):
            lost_id = new_report.id
            found_id = matching_report_id
        else:
            lost_id = matching_report_id
            found_id = new_report.id

        # Check if match already exists
        existing = await db.execute(
            select(Match).where(
                Match.lost_report_id == lost_id,
                Match.found_report_id == found_id,
            )
        )
        if existing.scalar_one_or_none():
            continue

        # Fetch the matching report
        mr_result = await db.execute(
            select(Report).where(Report.id == matching_report_id)
        )
        matching_report = mr_result.scalar_one_or_none()
        if not matching_report:
            continue

        # Person reports start as notified
        if new_report.report_type in ("person_missing", "person_found"):
            match_status = "notified"
            connected_at = None
            notif_type = "person_match"
        else:
            match_status = "notified"
            connected_at = None
            notif_type = "match_found"

        match = Match(
            lost_report_id=lost_id,
            found_report_id=found_id,
            similarity_score=result["score"],
            status=match_status,
            connected_at=connected_at,
        )
        db.add(match)
        await db.flush()

        # Fetch both reports (re-query to get freshest data)
        lr = await db.execute(select(Report).where(Report.id == lost_id))
        lost_report = lr.scalar_one()
        fr = await db.execute(select(Report).where(Report.id == found_id))
        found_report = fr.scalar_one()

        pct = round(result["score"] * 100)

        # Build notification messages
        if notif_type == "person_match":
            lost_title = "Potential Person Match Found 🔍"
            lost_msg = (
                f"A potential match was found for your missing person report: "
                f"'{lost_report.title}'. Please check My Matches for details."
            )
            found_title = "Potential Person Match Found 🔍"
            found_msg = (
                f"Your found-person report '{found_report.title}' may match a missing "
                f"person report. Please check My Matches for details."
            )
        else:
            lost_title = f"Match Found — {pct}% Similarity 🎯"
            lost_msg = (
                f"AI found a potential match for your lost item '{lost_report.title}' "
                f"with {pct}% similarity. Go to My Matches to claim it."
            )
            found_title = f"Someone May Want Your Found Item — {pct}% 🎯"
            found_msg = (
                f"Your found item report '{found_report.title}' matched a lost report "
                f"with {pct}% similarity. Check My Matches for status."
            )

        # Create notifications for lost report owner
        db.add(Notification(
            user_id=lost_report.user_id,
            type=notif_type,
            title=lost_title,
            message=lost_msg,
            related_report_id=lost_report.id,
            related_match_id=match.id,
        ))

        # Create notification for found report owner (skip if same user)
        if found_report.user_id != lost_report.user_id:
            db.add(Notification(
                user_id=found_report.user_id,
                type=notif_type,
                title=found_title,
                message=found_msg,
                related_report_id=found_report.id,
                related_match_id=match.id,
            ))

        matches_created.append(match)
        logger.info("Created match %s (%.0f%%)", match.id, result["score"] * 100)

    return matches_created
