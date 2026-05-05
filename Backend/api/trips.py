"""
API Router – Module Itinerary Management + Theo dõi lộ trình.

Itinerary: Tạo lộ trình, quản lý trạng thái chuyến đi.
Theo dõi:  Check-in tại trạm, xem tiến độ chuyến đi.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import (
    CreateItineraryRequest, ItineraryResponse, TripOut,
    CheckInRequest, CheckInResponse,
    TripProgressResponse, LocationOut,
)
from crud.crud_trip import (
    get_locations_by_ids,
    create_trip, create_trip_stops,
    get_trip_with_stops, update_trip_status,
    get_trip_stop, mark_stop_completed,
)
from core.algorithms import (
    estimate_travel_time, check_within_radius,
)

router = APIRouter(prefix="/api/trips", tags=["Trips - Lộ trình & Theo dõi"])


# ============================================================
# ITINERARY MANAGEMENT
# ============================================================

@router.post(
    "/create",
    response_model=ItineraryResponse,
    summary="Tạo lộ trình mới",
    description="""
    **Module Itinerary Management** – Nhận danh sách location_ids đã chọn:
    1. Validate tất cả location_ids tồn tại
    2. Giữ nguyên thứ tự user chọn (không tối ưu TSP)
    3. Ước lượng thời gian di chuyển giữa các trạm
    4. Tạo Trip + TripStops trong DB
    """,
)
async def create_itinerary(
    request: CreateItineraryRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Validate locations
    locations = await get_locations_by_ids(db, request.location_ids)
    found_ids = {loc.id for loc in locations}

    missing = [lid for lid in request.location_ids if lid not in found_ids]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Không tìm thấy địa điểm với ID: {missing}"
        )

    # 2. Sắp xếp locations theo thứ tự user chọn
    loc_map = {loc.id: loc for loc in locations}
    ordered_locations = [loc_map[lid] for lid in request.location_ids]

    # 3. Ước lượng tổng thời gian di chuyển
    total_time = 0.0
    for i in range(len(ordered_locations) - 1):
        a = ordered_locations[i]
        b = ordered_locations[i + 1]
        total_time += estimate_travel_time(
            a.latitude, a.longitude, b.latitude, b.longitude
        )

    # 4. Tạo Trip
    trip = await create_trip(
        db=db,
        user_id=request.user_id,
        name=request.trip_name,
        start_date=request.start_date,
        end_date=request.end_date,
        total_travel_time=total_time,
    )

    # 5. Tạo TripStops
    await create_trip_stops(db, trip.id, request.location_ids)

    # 6. Reload để lấy đầy đủ quan hệ
    trip = await get_trip_with_stops(db, trip.id)

    return ItineraryResponse(
        message="Tạo lộ trình thành công!",
        trip=TripOut.model_validate(trip),
    )


@router.get(
    "/{trip_id}",
    response_model=TripOut,
    summary="Xem chi tiết lộ trình",
)
async def get_trip_detail(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    trip = await get_trip_with_stops(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")
    return TripOut.model_validate(trip)


@router.put(
    "/{trip_id}/start",
    response_model=TripOut,
    summary="Bắt đầu chuyến đi (DRAFT → ACTIVE)",
)
async def start_trip(trip_id: str, db: AsyncSession = Depends(get_db)):
    trip = await get_trip_with_stops(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")
    if trip.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail=f"Chuyến đi đang ở trạng thái '{trip.status}', chỉ có thể bắt đầu từ DRAFT"
        )

    trip = await update_trip_status(db, trip_id, "ACTIVE")
    return TripOut.model_validate(trip)


@router.put(
    "/{trip_id}/complete",
    response_model=TripOut,
    summary="Hoàn thành chuyến đi (ACTIVE → COMPLETED)",
)
async def complete_trip(trip_id: str, db: AsyncSession = Depends(get_db)):
    trip = await get_trip_with_stops(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")
    if trip.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ có thể hoàn thành chuyến đi đang ACTIVE"
        )

    trip = await update_trip_status(db, trip_id, "COMPLETED")
    return TripOut.model_validate(trip)


@router.put(
    "/{trip_id}/cancel",
    response_model=TripOut,
    summary="Huỷ chuyến đi (→ CANCELLED)",
)
async def cancel_trip(trip_id: str, db: AsyncSession = Depends(get_db)):
    trip = await get_trip_with_stops(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")
    if trip.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(
            status_code=400,
            detail=f"Chuyến đi đã ở trạng thái '{trip.status}', không thể huỷ"
        )

    trip = await update_trip_status(db, trip_id, "CANCELLED")
    return TripOut.model_validate(trip)


# ============================================================
# THEO DÕI LỘ TRÌNH (Check-in + Tiến độ)
# ============================================================


@router.post(
    "/{trip_id}/checkin/{stop_id}",
    response_model=CheckInResponse,
    summary="Check-in tại trạm dừng",
    description="""
    **Module Progress Tracking** – Check-in 3 lớp xác thực:
    1. Trạm có thuộc chuyến đi này không? (Lớp 1 – Tính hợp lệ)
    2. Trạm đã check-in chưa? (Lớp 2 – Lịch sử)
    3. User có đang ở gần trạm không? (Lớp 3 – Không gian, bán kính 100m)
    """,
)
async def checkin_stop(
    trip_id: str,
    stop_id: str,
    request: CheckInRequest,
    db: AsyncSession = Depends(get_db),
):
    # Validate trip
    trip = await get_trip_with_stops(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")
    if trip.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Chỉ có thể check-in khi chuyến đi đang ACTIVE"
        )

    # Lớp 1: Trạm có thuộc chuyến đi?
    stop = None
    for s in trip.stops:
        if s.id == stop_id:
            stop = s
            break

    if not stop:
        raise HTTPException(
            status_code=400,
            detail="Trạm này không nằm trong chuyến đi hiện tại"
        )

    # Lớp 2: Đã check-in chưa?
    if stop.is_completed:
        raise HTTPException(
            status_code=409,
            detail=f"Trạm '{stop.location.name}' đã được check-in trước đó"
        )

    # Lớp 3: Kiểm tra khoảng cách (bán kính 100m = 0.1km)
    is_within, distance = check_within_radius(
        request.latitude, request.longitude,
        stop.location.latitude, stop.location.longitude,
        radius_km=0.1,
    )

    if not is_within:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Bạn cách trạm '{stop.location.name}' {distance*1000:.0f}m. "
                f"Cần ở trong phạm vi 100m để check-in."
            )
        )

    # Xác nhận check-in
    await mark_stop_completed(db, stop_id)

    return CheckInResponse(
        success=True,
        message=f"✅ Check-in thành công tại '{stop.location.name}'!",
        stop_id=stop_id,
        stop_name=stop.location.name,
    )


@router.get(
    "/{trip_id}/progress",
    response_model=TripProgressResponse,
    summary="Xem tiến độ chuyến đi",
)
async def get_trip_progress(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    trip = await get_trip_with_stops(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")

    total = len(trip.stops)
    completed = sum(1 for s in trip.stops if s.is_completed)
    pct = (completed / total * 100) if total > 0 else 0.0

    remaining = [
        LocationOut.model_validate(s.location)
        for s in trip.stops
        if not s.is_completed
    ]

    return TripProgressResponse(
        trip_id=trip.id,
        trip_name=trip.name,
        status=trip.status,
        total_stops=total,
        completed_stops=completed,
        completion_percentage=round(pct, 1),
        remaining_stops=remaining,
    )