# ============================================================
# api/trips.py  –  Itinerary build, tracking & check-in endpoints
# ============================================================

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from database import get_session
from core.algorithms import LocationCandidate, optimize_route
from core.config import settings
from core.google_maps import haversine_distance, is_within_radius
from crud import crud_location, crud_trip
from schemas import (
    CheckinRequest,
    CheckinResponse,
    DayPlan,
    GPSUpdate,
    ItineraryBuildRequest,
    ItineraryBuildResponse,
    RouteSegment,
    StopDetail,
    TrackingStatusResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /build  –  Xây dựng lộ trình từ danh sách locations
# ---------------------------------------------------------------------------

@router.post("/build", response_model=ItineraryBuildResponse)
def build_itinerary(
    body: ItineraryBuildRequest,
    db: Session = Depends(get_session),
):
    """
    Xây dựng lộ trình tối ưu từ danh sách locations đã chọn.

    Flow:
    1. Validate session + locations
    2. TSP DP Bitmask ordering
    3. Tính distance/time (Google Maps → Haversine fallback)
    4. Phân bổ stops theo ngày
    5. Tạo Itinerary + Days + Stops + Routes trong DB
    6. Return ItineraryBuildResponse
    """
    # 1. Validate planning session
    session = crud_trip.get_planning_session(db, body.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Planning session {body.session_id} không tồn tại.",
        )

    # 2. Validate & fetch locations
    if not body.location_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách location_ids không được rỗng.",
        )

    locations = crud_location.get_locations_by_ids(db, body.location_ids)
    if len(locations) != len(body.location_ids):
        found_ids = {loc.location_id for loc in locations}
        missing = [str(lid) for lid in body.location_ids if lid not in found_ids]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy locations: {', '.join(missing)}",
        )

    # 3. Convert to LocationCandidate for algorithm
    candidates: list[LocationCandidate] = []
    for loc in locations:
        candidates.append(LocationCandidate(
            location_id=loc.location_id,
            location_name=loc.location_name,
            latitude=float(loc.latitude),
            longitude=float(loc.longitude),
            city_id=loc.city_id,
            open_time=loc.open_time,
            close_time=loc.close_time,
            min_price=loc.min_price,
            max_price=loc.max_price,
        ))

    # 4. Optimize route
    optimized = optimize_route(
        locations=candidates,
        start_date=session.start_day,
        end_date=session.end_day,
    )

    # 5. Group stops by day and build days_data for CRUD
    days_dict: dict[int, dict] = {}
    for stop in optimized.stops:
        if stop.day not in days_dict:
            travel_date = session.start_day + timedelta(days=stop.day - 1)
            days_dict[stop.day] = {
                "day_order": stop.day,
                "travel_date": travel_date,
                "estimated_budget": Decimal("0"),
                "total_time": 0,
                "stops": [],
                "routes": [],
            }

        days_dict[stop.day]["stops"].append({
            "location_id": stop.location_id,
            "stop_order": stop.order,
            "arrival_time": stop.arrival_time,
            "departure_time": stop.departure_time,
            "checkin_radius": settings.DEFAULT_CHECKIN_RADIUS_METERS,
            "reward": 10,
        })
        # Accumulate budget (use min_price as estimate)
        days_dict[stop.day]["estimated_budget"] += stop.min_price

    # Assign routes to days
    for route in optimized.routes:
        # Find which day this route belongs to
        from_stop = next(
            (s for s in optimized.stops if s.order == route.from_order), None
        )
        if from_stop and from_stop.day in days_dict:
            days_dict[from_stop.day]["routes"].append({
                "from_stop_order": route.from_order,
                "to_stop_order": route.to_order,
                "travel_time": route.travel_time_min,
                "distance": Decimal(str(route.distance_km)),
                "polyline_data": route.polyline_data,
            })
            days_dict[from_stop.day]["total_time"] += route.travel_time_min

    days_data = sorted(days_dict.values(), key=lambda d: d["day_order"])

    # 6. Create in DB
    total_budget = sum(d["estimated_budget"] for d in days_data)
    itinerary = crud_trip.create_full_itinerary(
        db=db,
        user_id=session.user_id,
        session_id=session.session_id,
        total_budget=total_budget,
        total_travel_time=optimized.total_travel_time_min,
        total_distance=Decimal(str(optimized.total_distance_km)),
        days_data=days_data,
    )

    # 7. Build response
    response_days: list[DayPlan] = []
    for day_data in days_data:
        stops = [
            StopDetail(
                location_id=s["location_id"],
                location_name=next(
                    (c.location_name for c in candidates
                     if c.location_id == s["location_id"]),
                    "Unknown",
                ),
                stop_order=s["stop_order"],
                arrival_time=s["arrival_time"],
                departure_time=s["departure_time"],
                latitude=Decimal(str(next(
                    (c.latitude for c in candidates
                     if c.location_id == s["location_id"]),
                    0,
                ))),
                longitude=Decimal(str(next(
                    (c.longitude for c in candidates
                     if c.location_id == s["location_id"]),
                    0,
                ))),
            )
            for s in day_data["stops"]
        ]

        routes = [
            RouteSegment(
                from_stop_order=r["from_stop_order"],
                to_stop_order=r["to_stop_order"],
                travel_time=r["travel_time"],
                distance=r["distance"],
                polyline_data=r["polyline_data"],
            )
            for r in day_data["routes"]
        ]

        response_days.append(DayPlan(
            day_order=day_data["day_order"],
            travel_date=day_data["travel_date"],
            stops=stops,
            routes=routes,
            estimated_budget=day_data["estimated_budget"],
            total_time=day_data["total_time"],
        ))

    return ItineraryBuildResponse(
        itinerary_id=itinerary.itinerary_id,
        session_id=itinerary.session_id,
        name=itinerary.name,
        days=response_days,
        total_budget=total_budget,
        total_travel_time=optimized.total_travel_time_min,
        total_distance=Decimal(str(optimized.total_distance_km)),
    )


# ---------------------------------------------------------------------------
# GET /{itinerary_id}  –  Chi tiết lộ trình
# ---------------------------------------------------------------------------

@router.get("/{itinerary_id}")
def get_itinerary_detail(
    itinerary_id: UUID,
    db: Session = Depends(get_session),
):
    """Lấy chi tiết một lộ trình đã tạo."""
    itinerary = crud_trip.get_itinerary_by_id(db, itinerary_id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary {itinerary_id} không tồn tại.",
        )

    days = crud_trip.get_itinerary_days(db, itinerary_id)
    days_response = []
    for day in days:
        stops = crud_trip.get_day_stops(db, day.day_id)  # type: ignore
        routes = crud_trip.get_routes_for_day(db, day.day_id)  # type: ignore

        stops_data = []
        for stop in stops:
            location = crud_location.get_location_by_id(db, stop.location_id)
            stops_data.append({
                "stop_id": stop.stop_id,
                "location_id": stop.location_id,
                "location_name": location.location_name if location else "Unknown",
                "stop_order": stop.stop_order,
                "arrival_time": stop.arrival_time,
                "departure_time": stop.departure_time,
                "status": stop.status,
                "latitude": location.latitude if location else None,
                "longitude": location.longitude if location else None,
                "checkin_radius": stop.checkin_radius,
            })

        routes_data = [
            {
                "route_id": route.route_id,
                "from_stop_id": route.from_stop_id,
                "to_stop_id": route.to_stop_id,
                "travel_time": route.travel_time,
                "distance": route.distance,
                "polyline_data": route.polyline_data,
            }
            for route in routes
        ]

        days_response.append({
            "day_id": day.day_id,
            "day_order": day.day_order,
            "travel_date": day.travel_date,
            "estimated_budget": day.estimated_budget,
            "total_time": day.total_time,
            "stops": stops_data,
            "routes": routes_data,
        })

    return {
        "itinerary_id": itinerary.itinerary_id,
        "session_id": itinerary.session_id,
        "user_id": itinerary.user_id,
        "name": itinerary.name,
        "status": itinerary.status,
        "total_budget": itinerary.total_budget,
        "total_travel_time": itinerary.total_travel_time,
        "total_distance": itinerary.total_distance,
        "create_at": itinerary.create_at,
        "days": days_response,
    }


# ---------------------------------------------------------------------------
# POST /{itinerary_id}/gps  –  GPS update + deviation detection
# ---------------------------------------------------------------------------

@router.post("/{itinerary_id}/gps", response_model=TrackingStatusResponse)
def update_gps(
    itinerary_id: UUID,
    body: GPSUpdate,
    db: Session = Depends(get_session),
):
    """
    Nhận GPS coordinates từ client, kiểm tra deviation.

    Flow:
    1. Lấy tất cả stops của itinerary
    2. Tìm stop gần nhất (current/next)
    3. Tính khoảng cách tới route → nếu > threshold → cảnh báo
    4. Lưu GPS log
    """
    itinerary = crud_trip.get_itinerary_by_id(db, itinerary_id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary {itinerary_id} không tồn tại.",
        )

    # Lấy tất cả stops
    stops = crud_trip.get_all_stops_for_itinerary(db, itinerary_id)
    if not stops:
        return TrackingStatusResponse(
            is_on_route=True,
            message="Không có stops trong lộ trình.",
        )

    # Tìm current stop (đang VISITING hoặc PENDING gần nhất)
    user_lat = float(body.latitude)
    user_lon = float(body.longitude)

    nearest_stop = None
    nearest_dist = float("inf")
    next_stop = None

    for stop in stops:
        loc = crud_location.get_location_by_id(db, stop.location_id)
        if not loc:
            continue

        dist = haversine_distance(
            user_lat, user_lon,
            float(loc.latitude), float(loc.longitude),
        )

        if dist < nearest_dist:
            nearest_dist = dist
            nearest_stop = stop

        # Tìm next stop chưa hoàn thành
        if stop.status in ("PENDING", "VISITING") and next_stop is None:
            next_stop = stop

    # Kiểm tra deviation
    deviation_m = nearest_dist * 1000  # km → m
    is_on_route = deviation_m <= settings.DEVIATION_THRESHOLD_METERS

    if not is_on_route:
        # Lưu deviation log
        crud_trip.create_deviation_log(
            db=db,
            itinerary_id=itinerary_id,
            latitude=body.latitude,
            longitude=body.longitude,
        )

    return TrackingStatusResponse(
        is_on_route=is_on_route,
        deviation_distance_m=round(deviation_m, 1),
        current_stop_id=nearest_stop.stop_id if nearest_stop else None,
        next_stop_id=next_stop.stop_id if next_stop else None,
        message="Bạn đang trên lộ trình." if is_on_route else (
            f"Cảnh báo: Bạn đã chệch hướng {round(deviation_m)}m khỏi lộ trình!"
        ),
    )


# ---------------------------------------------------------------------------
# POST /{itinerary_id}/checkin  –  Check-in tại một stop
# ---------------------------------------------------------------------------

@router.post("/{itinerary_id}/checkin", response_model=CheckinResponse)
def checkin_at_stop(
    itinerary_id: UUID,
    body: CheckinRequest,
    db: Session = Depends(get_session),
):
    """
    Check-in tại một stop trong lộ trình.

    Validation 3 lớp:
    1. Stop phải thuộc itinerary này
    2. Chưa check-in trước đó
    3. Khoảng cách tới stop ≤ checkin_radius
    """
    # Lớp 1: Validate stop thuộc itinerary
    itinerary = crud_trip.get_itinerary_by_id(db, itinerary_id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary {itinerary_id} không tồn tại.",
        )

    stop = crud_trip.get_stop_by_id(db, body.stop_id)
    if not stop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stop {body.stop_id} không tồn tại.",
        )

    # Verify stop belongs to this itinerary
    all_stops = crud_trip.get_all_stops_for_itinerary(db, itinerary_id)
    stop_ids = {s.stop_id for s in all_stops}
    if stop.stop_id not in stop_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stop {body.stop_id} không thuộc itinerary {itinerary_id}.",
        )

    # Lớp 2: Kiểm tra chưa check-in
    existing = crud_trip.get_checkin_by_user_and_stop(
        db, itinerary.user_id, body.stop_id,
    )
    if existing:
        return CheckinResponse(
            is_completed=True,
            message="Bạn đã check-in tại điểm này rồi.",
        )

    # Lớp 3: Kiểm tra khoảng cách
    location = crud_location.get_location_by_id(db, stop.location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location cho stop {body.stop_id} không tồn tại.",
        )

    within, distance_m = is_within_radius(
        float(body.latitude), float(body.longitude),
        float(location.latitude), float(location.longitude),
        float(stop.checkin_radius),
    )

    if not within:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Bạn cách điểm check-in {round(distance_m)}m. "
                f"Cần ở trong bán kính {stop.checkin_radius}m."
            ),
        )

    # Check-in thành công
    checkin = crud_trip.create_checkin(
        db=db,
        user_id=itinerary.user_id,
        stop_id=body.stop_id,
        latitude=body.latitude,
        longitude=body.longitude,
    )

    return CheckinResponse(
        is_completed=True,
        message="Check-in thành công! 🎉",
        reward=stop.reward,
    )


# ---------------------------------------------------------------------------
# GET /{itinerary_id}/tracking  –  Dữ liệu tracking cho map
# ---------------------------------------------------------------------------

@router.get("/{itinerary_id}/tracking")
def get_tracking_data(
    itinerary_id: UUID,
    db: Session = Depends(get_session),
):
    """
    Lấy dữ liệu tracking của lộ trình (stops + routes + progress)
    để hiển thị trên bản đồ.
    """
    itinerary = crud_trip.get_itinerary_by_id(db, itinerary_id)
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary {itinerary_id} không tồn tại.",
        )

    stops = crud_trip.get_all_stops_for_itinerary(db, itinerary_id)

    tracking_stops = []
    for stop in stops:
        location = crud_location.get_location_by_id(db, stop.location_id)
        checkin = crud_trip.get_checkin_by_user_and_stop(
            db, itinerary.user_id, stop.stop_id,  # type: ignore
        )
        tracking_stops.append({
            "stop_id": stop.stop_id,
            "location_name": location.location_name if location else "Unknown",
            "stop_order": stop.stop_order,
            "latitude": location.latitude if location else None,
            "longitude": location.longitude if location else None,
            "status": stop.status,
            "is_checked_in": checkin is not None,
            "checkin_time": checkin.checkin_time if checkin else None,
            "checkin_radius": stop.checkin_radius,
        })

    # Lấy routes
    days = crud_trip.get_itinerary_days(db, itinerary_id)
    all_routes = []
    for day in days:
        routes = crud_trip.get_routes_for_day(db, day.day_id)  # type: ignore
        for route in routes:
            all_routes.append({
                "route_id": route.route_id,
                "from_stop_id": route.from_stop_id,
                "to_stop_id": route.to_stop_id,
                "travel_time": route.travel_time,
                "distance": route.distance,
                "polyline_data": route.polyline_data,
            })

    # Completion stats
    total_stops = len(tracking_stops)
    completed = sum(1 for s in tracking_stops if s["is_checked_in"])

    return {
        "itinerary_id": itinerary_id,
        "status": itinerary.status,
        "stops": tracking_stops,
        "routes": all_routes,
        "progress": {
            "total_stops": total_stops,
            "completed_stops": completed,
            "completion_rate": round(completed / total_stops * 100, 1) if total_stops > 0 else 0,
        },
    }