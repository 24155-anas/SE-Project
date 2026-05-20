"""
Pydantic request / response schemas for Milaap API.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ═══════════════════════════════════════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════════════════════════════════════


class UserRegister(BaseModel):
    """POST /auth/register request body."""

    email: EmailStr
    password: str = Field(min_length=6)
    name: str | None = None
    phone: str | None = None


class UserLogin(BaseModel):
    """POST /auth/login request body."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User info returned after registration."""

    user_id: UUID
    email: str
    name: str | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT token returned after login."""

    access_token: str
    token_type: str = "bearer"


# ═══════════════════════════════════════════════════════════════════════════
#  LOCATIONS
# ═══════════════════════════════════════════════════════════════════════════


class LocationHubRead(BaseModel):
    id: UUID
    name: str
    lat: float
    lng: float
    description: str | None = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════
#  REPORTS
# ═══════════════════════════════════════════════════════════════════════════


class MatchResult(BaseModel):
    """A single match result from Qdrant vector search."""

    report_id: str
    score: float
    title: str | None = None
    image_url: str | None = None
    location_name: str | None = None
    report_type: str | None = None


class ReportResponse(BaseModel):
    """Response after creating a report (includes potential matches)."""

    report_id: UUID
    image_url: str | None = None
    status: str = "active"
    matches: list[MatchResult] = []

    model_config = {"from_attributes": True}


class ReportDetail(BaseModel):
    """Full report detail for GET /reports/{id}."""

    id: UUID
    user_id: UUID
    report_type: str
    category: str | None = None
    title: str
    description: str | None = None
    location_name: str | None = None
    lat: float | None = None
    lng: float | None = None
    image_url: str | None = None
    status: str = "active"
    location_hub_id: UUID | None = None
    location_hub: LocationHubRead | None = None
    expires_at: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ReportListItem(BaseModel):
    """Slim report object for listing (GET /reports and GET /reports/my)."""

    id: UUID
    user_id: UUID
    report_type: str
    category: str | None = None
    title: str
    description: str | None = None
    location_name: str | None = None
    image_url: str | None = None
    status: str
    location_hub_id: UUID | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════════
#  MATCHES
# ═══════════════════════════════════════════════════════════════════════════


class MatchDetail(BaseModel):
    """Full match details with nested report info."""

    id: UUID
    lost_report_id: UUID
    found_report_id: UUID
    similarity_score: float
    status: str
    claimed_by_user_id: UUID | None = None
    verification_attempts: int
    max_attempts: int
    created_at: datetime

    # Include nested reports
    lost_report: ReportDetail
    found_report: ReportDetail

    model_config = {"from_attributes": True}


class ClaimMatchRequest(BaseModel):
    """Request to claim a match."""

    pass  # No body needed, match_id from URL


class VerifyMatchRequest(BaseModel):
    """Request to verify ownership."""

    answer: str


class VerifyMatchResponse(BaseModel):
    """Response after verification attempt."""

    success: bool
    message: str
    attempts_remaining: int | None = None
    can_retry_at: datetime | None = None
    contact_email: str | None = None  # Only if verified successfully


# ═══════════════════════════════════════════════════════════════════════════
#  SEARCH
# ═══════════════════════════════════════════════════════════════════════════


class TextSearchRequest(BaseModel):
    """POST /search/text request body."""

    query: str = Field(min_length=1)
    report_type: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    """A single search result from Qdrant."""

    report_id: str
    score: float
    title: str | None = None
    image_url: str | None = None
    description: str | None = None
    location_name: str | None = None
    report_type: str | None = None


# ═══════════════════════════════════════════════════════════════════════════
#  NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════


class NotificationRead(BaseModel):
    """Response schema for a single in-app notification."""

    id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    related_report_id: UUID | None = None
    related_match_id: UUID | None = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
