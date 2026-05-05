"""
CRUD Layer – Tầng truy xuất dữ liệu (Repository Pattern).

Toàn bộ SQL/ORM queries nằm ở đây.
Khi migrate sang Supabase, chỉ cần thay nội dung các hàm trong file này
(VD: đổi từ SQLAlchemy query sang Supabase client call).
Tầng API + Business logic KHÔNG cần thay đổi.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import Location, Trip, TripStop


# ============================================================
# LOCATION QUERIES
# ============================================================

async def get_locations_by_city(
    db: AsyncSession, city: str
) -> List[Location]:
    """Lấy tất cả địa điểm theo thành phố."""
    stmt = select(Location).where(
        Location.city.ilike(f"%{city}%")
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_locations_by_ids(
    db: AsyncSession, location_ids: List[str]
) -> List[Location]:
    """Lấy danh sách địa điểm theo list ID."""
    stmt = select(Location).where(Location.id.in_(location_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_location_count(db: AsyncSession) -> int:
    """Đếm tổng số địa điểm (dùng để check cần seed data không)."""
    from sqlalchemy import func
    stmt = select(func.count()).select_from(Location)
    result = await db.execute(stmt)
    return result.scalar_one()


# ============================================================
# TRIP QUERIES
# ============================================================

async def create_trip(
    db: AsyncSession,
    user_id: str,
    name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    total_estimated_budget: Optional[float] = None,
    total_travel_time: Optional[float] = None,
) -> Trip:
    """Tạo chuyến đi mới (status = DRAFT)."""
    trip = Trip(
        user_id=user_id,
        name=name,
        status="DRAFT",
        start_date=start_date,
        end_date=end_date,
        total_estimated_budget=total_estimated_budget,
        total_travel_time=total_travel_time,
    )
    db.add(trip)
    await db.flush()  # Để lấy ID ngay
    return trip


async def create_trip_stops(
    db: AsyncSession,
    trip_id: str,
    location_ids: List[str],
) -> List[TripStop]:
    """Tạo danh sách trạm dừng (giữ nguyên thứ tự user chọn)."""
    stops = []
    for order, loc_id in enumerate(location_ids, start=1):
        stop = TripStop(
            trip_id=trip_id,
            location_id=loc_id,
            stop_order=order,
        )
        db.add(stop)
        stops.append(stop)
    await db.flush()
    return stops


async def get_trip_with_stops(
    db: AsyncSession, trip_id: str
) -> Optional[Trip]:
    """Lấy chuyến đi kèm danh sách trạm + location info."""
    stmt = (
        select(Trip)
        .options(
            selectinload(Trip.stops).selectinload(TripStop.location)
        )
        .where(Trip.id == trip_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_active_trip_by_user(
    db: AsyncSession, user_id: str
) -> Optional[Trip]:
    """Lấy chuyến đi đang ACTIVE của user."""
    stmt = (
        select(Trip)
        .options(
            selectinload(Trip.stops).selectinload(TripStop.location)
        )
        .where(Trip.user_id == user_id, Trip.status == "ACTIVE")
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_trip_status(
    db: AsyncSession, trip_id: str, status: str
) -> Optional[Trip]:
    """Cập nhật trạng thái chuyến đi."""
    trip = await get_trip_with_stops(db, trip_id)
    if trip:
        trip.status = status
        await db.flush()
    return trip


# ============================================================
# TRIP STOP QUERIES
# ============================================================

async def get_trip_stop(
    db: AsyncSession, stop_id: str
) -> Optional[TripStop]:
    """Lấy 1 trạm dừng kèm location info."""
    stmt = (
        select(TripStop)
        .options(selectinload(TripStop.location))
        .where(TripStop.id == stop_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def mark_stop_completed(
    db: AsyncSession, stop_id: str
) -> Optional[TripStop]:
    """Đánh dấu trạm đã check-in."""
    stop = await get_trip_stop(db, stop_id)
    if stop:
        stop.is_completed = True
        stop.checked_in_at = datetime.utcnow()
        await db.flush()
    return stop
