"""
SQLAlchemy ORM models for Milaap — User, Report, Match, and ClaimAttempt tables.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class User(Base):
    """Registered user account."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_admin: Mapped[bool] = mapped_column(default=False)
    name: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    # relationships
    reports: Mapped[list["Report"]] = relationship(back_populates="user", lazy="selectin")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", lazy="select")

    def __repr__(self) -> str:
        return f"<User {self.email}>"


def _default_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=60)


class Report(Base):
    """Lost / Found / Person report submitted by a user."""

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    report_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'lost', 'found', 'person_missing', 'person_found'
    category: Mapped[str | None] = mapped_column(
        String(50)
    )  # 'wallet', 'phone', 'keys', 'bag', 'person', 'other'
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    location_name: Mapped[str | None] = mapped_column(
        String(255)
    )  # e.g. "Packages Mall, Lahore"
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    image_url: Mapped[str | None] = mapped_column(Text)  # Vercel Blob public URL
    status: Mapped[str] = mapped_column(
        String(20), default="active"
    )  # 'active', 'claimed', 'expired'
    qdrant_id: Mapped[str | None] = mapped_column(
        String(100)
    )  # UUID string used as Qdrant point ID

    # Secret Q&A for ownership verification (required for 'lost' reports)
    secret_question: Mapped[str | None] = mapped_column(Text)
    secret_answer_hash: Mapped[str | None] = mapped_column(String(255))

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_default_expiry
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="reports", lazy="selectin")

    location_hub_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("location_hubs.id"))
    location_hub: Mapped["LocationHub | None"] = relationship(back_populates="reports", lazy="selectin")

    lost_matches: Mapped[list["Match"]] = relationship(
        foreign_keys="Match.lost_report_id",
        back_populates="lost_report",
    )
    found_matches: Mapped[list["Match"]] = relationship(
        foreign_keys="Match.found_report_id", 
        back_populates="found_report"
    )

    def __repr__(self) -> str:
        return f"<Report {self.report_type}: {self.title}>"


class LocationHub(Base):
    __tablename__ = "location_hubs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    # Relationships
    reports: Mapped[list["Report"]] = relationship(back_populates="location_hub")


class Match(Base):
    """Represents a match between a lost and found report."""

    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lost_report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False
    )
    found_report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False
    )
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Status workflow: notified -> claimed -> verifying -> verified/rejected -> connected -> resolved
    status: Mapped[str] = mapped_column(String(30), default="notified")

    # Claim tracking
    claimed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    claim_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    claim_window_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Verification tracking
    verification_attempts: Mapped[int] = mapped_column(default=0)
    max_attempts: Mapped[int] = mapped_column(default=3)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Connection
    connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    lost_report: Mapped["Report"] = relationship(
        foreign_keys=[lost_report_id], back_populates="lost_matches", lazy="selectin"
    )
    found_report: Mapped["Report"] = relationship(
        foreign_keys=[found_report_id], back_populates="found_matches", lazy="selectin"
    )
    claimer: Mapped["User | None"] = relationship(foreign_keys=[claimed_by_user_id])
    attempts: Mapped[list["ClaimAttempt"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Match {self.id} ({self.status}): {self.lost_report_id} ↔ {self.found_report_id}>"


class ClaimAttempt(Base):
    """Tracks verification attempts for a match."""

    __tablename__ = "claim_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    answer_attempt: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(nullable=False)
    attempt_number: Mapped[int] = mapped_column(nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    can_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    match: Mapped["Match"] = relationship(back_populates="attempts")


class Notification(Base):
    """In-app notification for a user — replaces email notifications."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    # Types: 'match_found', 'person_match', 'claim_verified'
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    related_report_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reports.id"), nullable=True
    )
    related_match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id"), nullable=True
    )
    is_read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="notifications")
