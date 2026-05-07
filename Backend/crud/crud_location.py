"""
================================================================================
 crud/crud_location.py  │  USE CASE: Quản lý địa điểm & Gợi ý
================================================================================
 Q   Op      Table(s)                                        Function
 ──  ──────  ──────────────────────────────────────────────  ────────────────────────────────────
 Q1  SELECT  LOCATIONS, LOCATION_CATEGORIES, CITIES          get_locations_by_city_and_categories
 Q2  SELECT  TAGS, LOCATION_TAGS                             get_location_tags
 Q3  SELECT  LOCATIONS                                       get_location_by_ids
 Q4  SELECT  LOCATIONS_IMAGE                                 get_location_images
================================================================================
"""

from uuid import UUID

from sqlmodel import Session, select

from models import (
    Locations,
    LocationsImage,
    LocationTags,
    LocationCategories,
    Cities,
    Tags,
    LocationStats,
)

from typing import Optional

# ---------------------------------------------------------------------------
# Q1 – Lấy địa điểm theo thành phố & danh sách category
#       (SELECT locations JOIN location_categories JOIN cities WHERE ...)
# ---------------------------------------------------------------------------

def get_locations_by_city_and_categories(
    db: Session,
    city_name: str,
    category_ids: list[int],
) -> list:
    """
    Trả về danh sách địa điểm thuộc *city_name* mà có ít nhất một trong
    *category_ids* — phục vụ bước gợi ý địa điểm.

    Columns trả về:
        location_id, location_name, latitude, longitude,
        min_price, max_price, currency, open_time, close_time.

    Parameters
    ----------
    category_ids : list[int]
        Danh sách category_id cần lọc (tương đương SQL ``IN (?)``).
    """
    statement = (
        select(
            Locations.location_id,
            Locations.location_name,
            Locations.latitude,
            Locations.longitude,
            Locations.min_price,
            Locations.max_price,
            Locations.currency,
            Locations.open_time,
            Locations.close_time,
        )
        .join(LocationCategories, Locations.location_id == LocationCategories.location_id)
        .join(Cities, Locations.city_id == Cities.city_id)
        .where(
            Cities.city_name == city_name,
            LocationCategories.category_id.in_(category_ids),
        )
        .distinct()
    )
    return db.exec(statement).all()


# ---------------------------------------------------------------------------
# Q2 – Lấy tag của địa điểm  (SELECT tags JOIN location_tags WHERE location_id = ?)
# ---------------------------------------------------------------------------

def get_location_tags(db: Session, location_id: UUID) -> list:
    """
    Lấy danh sách tag gắn với *location_id* — phục vụ chấm điểm gợi ý.

    Columns trả về: tag_id, tag_name.
    """
    statement = (
        select(Tags.tag_id, Tags.tag_name)
        .join(LocationTags, Tags.tag_id == LocationTags.tag_id)
        .where(LocationTags.location_id == location_id)
    )
    return db.exec(statement).all()


# ---------------------------------------------------------------------------
# Q3 – Lấy chi tiết các địa điểm theo danh sách ID
#       (SELECT locations WHERE location_id IN (?))
# ---------------------------------------------------------------------------

def get_location_by_ids(db: Session, location_ids: list[UUID]) -> list[Locations]:
    """
    Lấy thông tin chi tiết của các địa điểm trong *location_ids*.

    Columns trả về:
        location_id, location_name, latitude, longitude,
        open_time, close_time, min_price, max_price, currency.
    """
    statement = (
        select(
            Locations.location_id,
            Locations.location_name,
            Locations.latitude,
            Locations.longitude,
            Locations.open_time,
            Locations.close_time,
            Locations.min_price,
            Locations.max_price,
            Locations.currency,
        )
        .where(Locations.location_id.in_(location_ids))
    )
    return db.exec(statement).all()


# ---------------------------------------------------------------------------
# Q4 – Lấy ảnh của địa điểm  (SELECT locations_image WHERE location_id = ?)
# ---------------------------------------------------------------------------

def get_location_images(db: Session, location_id: UUID) -> list[LocationsImage]:
    """
    Lấy danh sách ảnh của *location_id*, sắp xếp theo ``display_order`` tăng dần.

    Columns trả về: image_id, location_id, url, display_order.
    """
    statement = (
        select(
            LocationsImage.image_id,
            LocationsImage.location_id,
            LocationsImage.url,
            LocationsImage.display_order,
        )
        .where(LocationsImage.location_id == location_id)
        .order_by(LocationsImage.display_order.asc())
    )
    return db.exec(statement).all()


# ---------------------------------------------------------------------------
# Q5 – Tăng lượt xem (View Count)  (UPDATE location_stats)
# ---------------------------------------------------------------------------

def increment_location_view_count(db: Session, location_id: UUID) -> LocationStats:
    """
    Tăng tổng số lượt xem (total_views) của một địa điểm.
    Nếu địa điểm chưa có record trong bảng location_stats, tạo mới.
    """
    statement = select(LocationStats).where(LocationStats.location_id == location_id)
    stats = db.exec(statement).first()
    
    if stats:
        stats.total_views += 1
    else:
        stats = LocationStats(
            location_id=location_id,
            total_views=1,
            total_checkins=0,
            completion_rate=0.0
        )
    
    db.add(stats)
    db.commit()
    db.refresh(stats)
    return stats


# ---------------------------------------------------------------------------
# Q6 – Tăng lượt check-in (Check-in Count)  (UPDATE location_stats)
# ---------------------------------------------------------------------------

def increment_location_checkin_count(db: Session, location_id: UUID) -> LocationStats:
    """
    Tăng tổng số lượt check-in (total_checkins) của một địa điểm.
    Nếu địa điểm chưa có record trong bảng location_stats, tạo mới.
    """
    statement = select(LocationStats).where(LocationStats.location_id == location_id)
    stats = db.exec(statement).first()
    
    if stats:
        stats.total_checkins += 1
    else:
        stats = LocationStats(
            location_id=location_id,
            total_views=0,
            total_checkins=1,
            completion_rate=0.0
        )
    
    db.add(stats)
    db.commit()
    db.refresh(stats)
    return stats


# ---------------------------------------------------------------------------
# Q7 – Lấy thống kê của địa điểm  (SELECT location_stats)
# ---------------------------------------------------------------------------

def get_location_stats(db: Session, location_id: UUID) -> Optional[LocationStats]:
    """
    Lấy thông tin thống kê (lượt xem, check-in, completion rate) của địa điểm.
    """
    statement = select(LocationStats).where(LocationStats.location_id == location_id)
    return db.exec(statement).first()
