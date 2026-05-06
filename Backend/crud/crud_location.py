# ============================================================
# crud/crud_location.py  –  Location CRUD operations
# ============================================================

from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlmodel import Session, select

from models import (
    Categories,
    CategoryVisitHistory,
    Cities,
    LocationCategories,
    LocationStats,
    LocationTags,
    Locations,
    LocationsImage,
    PreferenceTagWeights,
    Tags,
)


# ---------------------------------------------------------------------------
# Read – Locations
# ---------------------------------------------------------------------------

def get_locations_by_city(db: Session, city_id: int) -> Sequence[Locations]:
    """Lấy tất cả locations thuộc 1 city."""
    statement = (
        select(Locations)
        .where(Locations.city_id == city_id)
        .order_by(Locations.location_name)
    )
    return db.exec(statement).all()


def get_location_by_id(db: Session, location_id: UUID) -> Optional[Locations]:
    """Lấy 1 location theo ID."""
    return db.get(Locations, location_id)


def get_locations_by_ids(db: Session, location_ids: list[UUID]) -> Sequence[Locations]:
    """Lấy nhiều locations theo danh sách IDs."""
    statement = select(Locations).where(Locations.location_id.in_(location_ids))  # type: ignore[union-attr]
    return db.exec(statement).all()


# ---------------------------------------------------------------------------
# Read – Tags & Categories for a location
# ---------------------------------------------------------------------------

def get_location_tag_ids(db: Session, location_id: UUID) -> list[int]:
    """Lấy danh sách tag_id của 1 location."""
    statement = (
        select(LocationTags.tag_id)
        .where(LocationTags.location_id == location_id)
    )
    return list(db.exec(statement).all())


def get_location_tag_names(db: Session, location_id: UUID) -> list[str]:
    """Lấy danh sách tag_name của 1 location."""
    statement = (
        select(Tags.tag_name)
        .join(LocationTags, Tags.tag_id == LocationTags.tag_id)
        .where(LocationTags.location_id == location_id)
    )
    return list(db.exec(statement).all())


def get_location_category_ids(db: Session, location_id: UUID) -> list[int]:
    """Lấy danh sách category_id của 1 location."""
    statement = (
        select(LocationCategories.category_id)
        .where(LocationCategories.location_id == location_id)
    )
    return list(db.exec(statement).all())


def get_location_category_names(db: Session, location_id: UUID) -> list[str]:
    """Lấy danh sách category_name của 1 location."""
    statement = (
        select(Categories.category_name)
        .join(LocationCategories, Categories.category_id == LocationCategories.category_id)
        .where(LocationCategories.location_id == location_id)
    )
    return list(db.exec(statement).all())


def get_location_stats(db: Session, location_id: UUID) -> Optional[LocationStats]:
    """Lấy stats (views, checkins) của 1 location (bản ghi mới nhất)."""
    statement = (
        select(LocationStats)
        .where(LocationStats.location_id == location_id)
        .order_by(LocationStats.recorded_at.desc())  # type: ignore[union-attr]
    )
    return db.exec(statement).first()


# ---------------------------------------------------------------------------
# Read – User preferences
# ---------------------------------------------------------------------------

def get_user_tag_weights(db: Session, user_id: UUID) -> dict[int, float]:
    """Lấy preference tag weights của user → {tag_id: weight}."""
    statement = (
        select(PreferenceTagWeights)
        .where(PreferenceTagWeights.user_id == user_id)
    )
    rows = db.exec(statement).all()
    return {row.tag_id: row.weight for row in rows}


def get_user_category_history(db: Session, user_id: UUID) -> dict[int, int]:
    """Lấy category visit history → {category_id: visit_count}."""
    statement = (
        select(CategoryVisitHistory)
        .where(CategoryVisitHistory.user_id == user_id)
    )
    rows = db.exec(statement).all()
    return {row.category_id: row.visit_count for row in rows}


# ---------------------------------------------------------------------------
# Read – Cities
# ---------------------------------------------------------------------------

def get_city_by_id(db: Session, city_id: int) -> Optional[Cities]:
    """Lấy thông tin 1 city."""
    return db.get(Cities, city_id)


def get_active_cities(db: Session) -> Sequence[Cities]:
    """Lấy tất cả cities đang active."""
    statement = select(Cities).where(Cities.is_active == True)
    return db.exec(statement).all()


# ---------------------------------------------------------------------------
# Read – Location images
# ---------------------------------------------------------------------------

def get_location_images(db: Session, location_id: UUID) -> Sequence[LocationsImage]:
    """Lấy danh sách ảnh của 1 location."""
    statement = (
        select(LocationsImage)
        .where(LocationsImage.location_id == location_id)
        .order_by(LocationsImage.display_order)
    )
    return db.exec(statement).all()
