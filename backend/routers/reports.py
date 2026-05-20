"""
Reports Router — create, list, detail, and claim reports.

The POST /reports endpoint handles the full pipeline:
  validate → upload image → save to DB → embed with CLIP → upsert to Qdrant → match
"""

import logging
from io import BytesIO
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from passlib.context import CryptContext
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import Report, User
from backend.routers.auth import get_current_user
from backend.schemas import MatchResult, ReportDetail, ReportListItem, ReportResponse
from backend.services import ai_service, blob_service, matching_service, qdrant_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Constants ───────────────────────────────────────────────────────────────
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg"}
MATCH_THRESHOLD = 0.70

VALID_REPORT_TYPES = ("lost", "found", "person_missing", "person_found")


def _opposite_type(report_type: str) -> str | None:
    """Return the opposite report type for matching."""
    mapping = {
        "lost": "found",
        "found": "lost",
        "person_missing": "person_found",
        "person_found": "person_missing",
    }
    return mapping.get(report_type)


async def _validate_image(image: UploadFile) -> bytes:
    """Validate uploaded image: check content type, size, and magic bytes."""
    # Check declared content type
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type: {image.content_type}. Allowed: JPEG, PNG.",
        )

    # Read image bytes
    image_bytes = await image.read()

    # Check size
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image too large ({len(image_bytes)} bytes). Max: {MAX_IMAGE_SIZE} bytes.",
        )

    # Verify with Pillow (checks magic bytes / actual format)
    try:
        img = Image.open(BytesIO(image_bytes))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a valid image.",
        )

    return image_bytes


# ═══════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    background_tasks: BackgroundTasks,
    report_type: str = Form(...),
    category: str = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    location_name: str = Form(...),
    lat: float = Form(None),
    lng: float = Form(None),
    location_hub_id: UUID = Form(None),
    sos: bool = Form(False),
    secret_question: str = Form(None),
    secret_answer: str = Form(None),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a new lost/found/person report.

    Full pipeline:
    1. Validate image (type, size, magic bytes)
    2. Upload image to Vercel Blob → public URL
    3. Save report to PostgreSQL
    4. Generate CLIP embedding of image
    5. Search Qdrant for matches (opposite type, score > 0.70)
    6. Create Match records in database
    7. Upsert embedding to Qdrant (background task)
    8. Return report + matches
    """
    # Validate report_type
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"report_type must be one of: {', '.join(VALID_REPORT_TYPES)}.",
        )

    # Validate secret Q&A for lost reports
    if report_type == "lost" and (not secret_question or not secret_answer):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Secret question and answer are required for lost reports.",
        )

    # Hash secret answer if provided
    secret_answer_hash = None
    if secret_answer:
        secret_answer_hash = pwd_context.hash(secret_answer.lower().strip())

    # 1. Validate image
    image_bytes = await _validate_image(image)

    # 2. Upload to Vercel Blob
    image_url = await blob_service.upload_image(image_bytes, image.content_type)

    # 3. Save report to PostgreSQL
    report = Report(
        user_id=current_user.id,
        report_type=report_type,
        category=category,
        title=title,
        description=description,
        location_name=location_name,
        lat=lat,
        lng=lng,
        location_hub_id=location_hub_id,
        image_url=image_url,
        status="active",
        secret_question=secret_question,
        secret_answer_hash=secret_answer_hash,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)

    # Store the report ID as the qdrant point ID
    report_id_str = str(report.id)
    report.qdrant_id = report_id_str

    # 4. Generate CLIP embedding
    embedding = ai_service.get_image_embedding(image_bytes)

    # 5. Search for matches BEFORE upserting (so we don't self-match)
    opposite = _opposite_type(report_type)
    search_type = opposite if opposite else None

    raw_matches = await qdrant_service.search_similar(
        query_vector=embedding,
        report_type=search_type,
        exclude_status="claimed",
        top_k=5,
        exclude_id=report_id_str,
    )

    # Filter by threshold for response
    matches = [
        MatchResult(
            report_id=m["report_id"],
            score=m["score"],
            title=m.get("title"),
            image_url=m.get("image_url"),
            location_name=m.get("location_name"),
            report_type=m.get("report_type"),
        )
        for m in raw_matches
        if m["score"] >= MATCH_THRESHOLD
    ]

    # 6. Create Match records in database
    await matching_service.create_matches_from_search(
        db=db,
        new_report=report,
        search_results=raw_matches,
        threshold=MATCH_THRESHOLD,
    )

    # 7. Upsert to Qdrant in background (fast response)
    qdrant_payload = {
        "report_id": report_id_str,
        "report_type": report_type,
        "category": category or "",
        "title": title,
        "image_url": image_url,
        "location_name": location_name or "",
        "location_hub_id": str(location_hub_id) if location_hub_id else "",
        "status": "active",
        "created_at": report.created_at.isoformat() if report.created_at else "",
    }
    background_tasks.add_task(
        qdrant_service.upsert_report, report_id_str, embedding, qdrant_payload
    )

    # 8. Return response
    return ReportResponse(
        report_id=report.id,
        image_url=image_url,
        status="active",
        matches=matches,
    )


@router.get("", response_model=list[ReportListItem])
async def list_reports(
    type: str | None = None,
    category: str | None = None,
    hub_id: UUID | None = None,
    status_filter: str = "active",
    db: AsyncSession = Depends(get_db),
):
    """List reports with optional filtering by type, category, and status."""
    query = select(Report)

    if type:
        query = query.where(Report.report_type == type)
    if category:
        query = query.where(Report.category == category)
    if hub_id:
        query = query.where(Report.location_hub_id == hub_id)
    if status_filter:
        query = query.where(Report.status == status_filter)

    query = query.order_by(Report.created_at.desc())

    result = await db.execute(query)
    reports = result.scalars().all()

    return [ReportListItem.model_validate(r) for r in reports]


@router.get("/my", response_model=list[ReportListItem])
async def list_my_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all reports submitted by the current user (all statuses, all types)."""
    query = (
        select(Report)
        .where(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
    )
    result = await db.execute(query)
    reports = result.scalars().all()
    return [ReportListItem.model_validate(r) for r in reports]


@router.get("/{report_id}", response_model=ReportDetail)
async def get_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get full details of a single report."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    return ReportDetail.model_validate(report)


@router.patch("/{report_id}/claim")
async def claim_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a report as claimed in both PostgreSQL and Qdrant."""
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    # Update PostgreSQL
    report.status = "claimed"

    # Update Qdrant payload
    report_id_str = str(report.id)
    try:
        await qdrant_service.update_payload(report_id_str, {"status": "claimed"})
    except Exception as e:
        logger.warning("Failed to update Qdrant payload for %s: %s", report_id_str, e)

    return {"detail": "Report marked as claimed", "report_id": str(report.id)}
