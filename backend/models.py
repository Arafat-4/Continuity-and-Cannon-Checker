from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)

from sqlalchemy.dialects.postgresql import JSONB

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from database import Base


# ==================================================
# MANUSCRIPT
# ==================================================

class Manuscript(Base):
    __tablename__ = "manuscripts"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    title: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    chapters: Mapped[list["Chapter"]] = relationship(
        "Chapter",
        back_populates="manuscript",
        cascade="all, delete-orphan",
        order_by="Chapter.chapter_number",
    )

    canon: Mapped["Canon | None"] = relationship(
        "Canon",
        back_populates="manuscript",
        cascade="all, delete-orphan",
        uselist=False,
    )

    conflicts: Mapped[list["Conflict"]] = relationship(
        "Conflict",
        back_populates="manuscript",
        cascade="all, delete-orphan",
    )

    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="manuscript",
        cascade="all, delete-orphan",
    )


# ==================================================
# CHAPTER
# ==================================================

class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    manuscript_id: Mapped[int] = mapped_column(
        ForeignKey(
            "manuscripts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    chapter_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    chapter_title: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    raw_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    manuscript: Mapped["Manuscript"] = relationship(
        "Manuscript",
        back_populates="chapters",
    )

    facts: Mapped["ChapterFacts | None"] = relationship(
        "ChapterFacts",
        back_populates="chapter",
        cascade="all, delete-orphan",
        uselist=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "manuscript_id",
            "chapter_number",
            name="uq_manuscript_chapter",
        ),
    )


# ==================================================
# CHAPTER FACTS
# ==================================================

class ChapterFacts(Base):
    __tablename__ = "chapter_facts"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    chapter_id: Mapped[int] = mapped_column(
        ForeignKey(
            "chapters.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="success",
    )

    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    chapter: Mapped["Chapter"] = relationship(
        "Chapter",
        back_populates="facts",
    )


# ==================================================
# CANON
# ==================================================

class Canon(Base):
    __tablename__ = "canon"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    manuscript_id: Mapped[int] = mapped_column(
        ForeignKey(
            "manuscripts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    manuscript: Mapped["Manuscript"] = relationship(
        "Manuscript",
        back_populates="canon",
    )


# ==================================================
# CONFLICT
# ==================================================

class Conflict(Base):
    __tablename__ = "conflicts"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    manuscript_id: Mapped[int] = mapped_column(
        ForeignKey(
            "manuscripts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    conflict_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    severity: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    manuscript: Mapped["Manuscript"] = relationship(
        "Manuscript",
        back_populates="conflicts",
    )

    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="conflict",
        cascade="all, delete-orphan",
    )


# ==================================================
# REVIEW
# ==================================================

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    manuscript_id: Mapped[int] = mapped_column(
        ForeignKey(
            "manuscripts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    conflict_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "conflicts.id",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="needs_review",
    )

    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    manuscript: Mapped["Manuscript"] = relationship(
        "Manuscript",
        back_populates="reviews",
    )

    conflict: Mapped["Conflict | None"] = relationship(
        "Conflict",
        back_populates="reviews",
    )