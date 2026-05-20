"""
Matches Router — claim, verify, and manage matches.
"""

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import ClaimAttempt, Match, Notification, Report, User
from backend.routers.auth import get_current_user
from backend.schemas import MatchDetail, VerifyMatchRequest, VerifyMatchResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/matches", tags=["matches"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("/my", response_model=list[MatchDetail])
async def get_my_matches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all matches related to current user's reports."""
    user_reports = await db.execute(
        select(Report.id).where(Report.user_id == current_user.id)
    )
    report_ids = [r[0] for r in user_reports.all()]

    if not report_ids:
        return []

    matches = await db.execute(
        select(Match).where(
            (Match.lost_report_id.in_(report_ids))
            | (Match.found_report_id.in_(report_ids))
        )
    )
    return [MatchDetail.model_validate(m) for m in matches.scalars().all()]


@router.post("/{match_id}/claim", status_code=status.HTTP_200_OK)
async def claim_match(
    match_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Claim a match (start verification process)."""
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.status == "verified":
        raise HTTPException(status_code=400, detail="Match already verified")

    if match.status == "connected":
        raise HTTPException(status_code=400, detail="Match already connected")

    if match.claimed_by_user_id and match.claimed_by_user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Match claimed by another user")

    match.status = "claimed"
    match.claimed_by_user_id = current_user.id
    match.claim_started_at = datetime.now(timezone.utc)
    match.claim_window_ends_at = datetime.now(timezone.utc) + timedelta(hours=24)

    lost_report_r = await db.execute(
        select(Report).where(Report.id == match.lost_report_id)
    )
    lost_report = lost_report_r.scalar_one()

    return {
        "message": "Match claimed. Please answer the secret question.",
        "secret_question": lost_report.secret_question,
        "attempts_remaining": match.max_attempts - match.verification_attempts,
    }


@router.post("/{match_id}/verify", response_model=VerifyMatchResponse)
async def verify_match(
    match_id: UUID,
    body: VerifyMatchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify ownership by answering secret question."""
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.claimed_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You haven't claimed this match")

    # Check if max attempts exceeded with cooldown
    if match.verification_attempts >= match.max_attempts:
        last_att_r = await db.execute(
            select(ClaimAttempt)
            .where(
                ClaimAttempt.match_id == match.id,
                ClaimAttempt.user_id == current_user.id,
            )
            .order_by(ClaimAttempt.attempted_at.desc())
        )
        last_att = last_att_r.scalar_one_or_none()

        if last_att:
            can_retry = last_att.attempted_at + timedelta(hours=24)
            if datetime.now(timezone.utc) < can_retry:
                return VerifyMatchResponse(
                    success=False,
                    message="Max attempts exceeded. Try again in 24 hours.",
                    can_retry_at=can_retry,
                )
            else:
                match.verification_attempts = 0
                match.status = "claimed"

    # Get lost report for answer hash
    lr = await db.execute(select(Report).where(Report.id == match.lost_report_id))
    lost_report = lr.scalar_one()

    user_answer = body.answer.lower().strip()
    is_correct = pwd_context.verify(user_answer, lost_report.secret_answer_hash)

    attempt_number = match.verification_attempts + 1
    can_retry_at = None
    if not is_correct:
        if attempt_number == 1:
            can_retry_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        elif attempt_number == 2:
            can_retry_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    claim_attempt = ClaimAttempt(
        match_id=match.id,
        user_id=current_user.id,
        answer_attempt=user_answer,
        is_correct=is_correct,
        attempt_number=attempt_number,
        can_retry_at=can_retry_at,
    )
    db.add(claim_attempt)
    match.verification_attempts += 1

    if is_correct:
        match.status = "verified"
        match.verified_at = datetime.now(timezone.utc)
        match.connected_at = datetime.now(timezone.utc)

        lu = await db.execute(select(User).where(User.id == lost_report.user_id))
        lost_user = lu.scalar_one()
        fr = await db.execute(select(Report).where(Report.id == match.found_report_id))
        found_report = fr.scalar_one()
        fu = await db.execute(select(User).where(User.id == found_report.user_id))
        found_user = fu.scalar_one()

        # In-app notifications for both users
        db.add(Notification(
            user_id=current_user.id,
            type="claim_verified",
            title="Ownership Verified! Item Returned ✅",
            message=(
                f"Your ownership of '{lost_report.title}' has been verified! "
                f"Contact the finder at: {found_user.email} to arrange collection."
            ),
            related_report_id=lost_report.id,
            related_match_id=match.id,
        ))
        if found_user.id != current_user.id:
            db.add(Notification(
                user_id=found_user.id,
                type="claim_verified",
                title="Owner Verified — Item Claimed ✅",
                message=(
                    f"The owner of '{found_report.title}' has verified their ownership. "
                    f"Contact them at: {current_user.email} to return the item."
                ),
                related_report_id=found_report.id,
                related_match_id=match.id,
            ))

        return VerifyMatchResponse(
            success=True,
            message="Verification successful!",
            contact_email=found_user.email,
        )
    else:
        remaining = match.max_attempts - match.verification_attempts
        if remaining == 0:
            match.status = "rejected"
            match.rejected_at = datetime.now(timezone.utc)
            return VerifyMatchResponse(
                success=False,
                message="All attempts exhausted. Try again in 24 hours.",
                attempts_remaining=0,
                can_retry_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )
        return VerifyMatchResponse(
            success=False,
            message=f"Incorrect answer. {remaining} attempts remaining.",
            attempts_remaining=remaining,
            can_retry_at=can_retry_at,
        )

@router.patch("/{match_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_match(
    match_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a match as resolved."""
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if user owns one of the reports
    user_reports = await db.execute(select(Report.id).where(Report.user_id == current_user.id))
    user_report_ids = [r[0] for r in user_reports.all()]
    
    if match.lost_report_id not in user_report_ids and match.found_report_id not in user_report_ids:
        raise HTTPException(status_code=403, detail="You are not authorized to resolve this match")

    match.status = "resolved"
    match.resolved_at = datetime.now(timezone.utc)
    
    # Also mark reports as claimed/resolved
    lr_r = await db.execute(select(Report).where(Report.id == match.lost_report_id))
    lr = lr_r.scalar_one()
    fr_r = await db.execute(select(Report).where(Report.id == match.found_report_id))
    fr = fr_r.scalar_one()
    
    lr.status = "claimed"
    fr.status = "claimed"
    
    return {"detail": "Match marked as resolved"}

@router.get("/report/{report_id}", response_model=list[MatchDetail])
async def get_matches_for_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all matches for a specific report."""
    # Verify ownership of report
    r_r = await db.execute(select(Report).where(Report.id == report_id, Report.user_id == current_user.id))
    report = r_r.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not yours")

    matches = await db.execute(
        select(Match).where(
            (Match.lost_report_id == report_id) | (Match.found_report_id == report_id)
        )
    )
    return [MatchDetail.model_validate(m) for m in matches.scalars().all()]
