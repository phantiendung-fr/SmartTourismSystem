from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from datetime import datetime, timedelta, time
import math

from database import get_session
import core.security as security
import crud.crud_user as crud_user
from schemas import (
    CreateItineraryRequest, ItineraryOut, TrackingRequest,
    CheckInRequest, CheckInResponse, TripProgressResponse, DeviationAlert
)
from crud.crud_location import get_locations_by_ids
from crud.crud_trip import (
    create_itinerary, create_itinerary_day, create_itinerary_stop, create_itinerary_route,
    get_itinerary_by_id, get_itinerary_stop, mark_stop_completed
)
from crud.crud_itinerary import update_itinerary_status
from models import Locations

from core.algorithms import check_within_radius, tsp_dp_bitmask
from core.google_maps import get_route_polyline

router = APIRouter(prefix="/api/trips", tags=["Trips - Lộ trình & Theo dõi"])

def get_current_user_id(db: Session, current_user_dict: dict) -> str:
    """Lấy user_id thực tế từ database dựa trên email trong token."""
    email = current_user_dict.get("sub")
    user = crud_user.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=401, detail="User không tồn tại")
    return user.user_id


@router.post("/create", response_model=ItineraryOut, summary="Tạo lộ trình mới")
def create_new_itinerary(
    request: CreateItineraryRequest, 
    db: Session = Depends(get_session),
    current_user: dict = Depends(security.verify_token)
):
    user_id = get_current_user_id(db, current_user)

    # 1. Validate locations
    locations = get_locations_by_ids(db, request.location_ids)
    found_ids = {loc.location_id for loc in locations}
    missing = [lid for lid in request.location_ids if lid not in found_ids]
    if missing:
        raise HTTPException(status_code=400, detail=f"Không tìm thấy địa điểm: {missing}")

    loc_map = {loc.location_id: loc for loc in locations}
    # 2. Tạo bản ghi Itinerary (Lộ trình tổng)
    trip = create_itinerary(db, user_id=user_id, name=request.name, total_travel_time=0)
    # 3. Phân bổ ngày (Day Clustering)
    # Giả sử request có truyền end_date, nếu không mặc định là 1 ngày
    num_days = 1
    if hasattr(request, 'end_date') and request.end_date:
        num_days = max(1, (request.end_date - request.start_date).days + 1)
    
    # Chia đều số lượng địa điểm ra các ngày
    chunk_size = math.ceil(len(request.location_ids) / num_days)
    chunks = [request.location_ids[i:i + chunk_size] for i in range(0, len(request.location_ids), chunk_size)]

    global_total_time = 0

    # 4. Tối ưu TSP & Tính thời gian từng ngày
    for day_index, chunk_ids in enumerate(chunks):
        current_date = request.start_date + timedelta(days=day_index)

        # Chuẩn bị data cho TSP: List[(id, lat, lon)]
        tsp_input = [(lid, float(loc_map[lid].latitude), float(loc_map[lid].longitude)) for lid in chunk_ids]

        # Gọi thuật toán tối ưu của team để lấy thứ tự đi chuẩn nhất
        optimized_ids, daily_dist = tsp_dp_bitmask(tsp_input)

        # Tạo bản ghi Day
        day = create_itinerary_day(
            db, itinerary_id=trip.itinerary_id, day_order=day_index + 1,
            travel_date=current_date.isoformat(), total_time=0
        )

        # Setup thời gian bắt đầu đi chơi (VD: 8:00 AM)
        current_dt = datetime.combine(current_date, time(8, 0))
        daily_time = 0

        # Biến tạm để giữ ID của trạm trước đó (phục vụ vẽ Route)
        prev_stop_id = None

        for order, loc_id in enumerate(optimized_ids, start=1):
            loc = loc_map[loc_id]

            # Thời gian đến (Arrival)
            arrival_time = current_dt.time()

            # Giả định thời gian chơi mặc định tại 1 điểm là 90 phút (có thể lấy từ DB sau)
            play_duration_mins = 90
            current_dt += timedelta(minutes=play_duration_mins)
            departure_time = current_dt.time()

            # Lưu Stop vào DB
            new_stop = create_itinerary_stop(
                db, day_id=day.day_id, location_id=loc_id, stop_order=order,
                arrival_time=arrival_time, departure_time=departure_time
            )
            daily_time += play_duration_mins

            # Vẽ Route từ trạm trước đến trạm này
            if prev_stop_id is not None:
                prev_loc = loc_map[optimized_ids[order - 2]]
                # Gọi Google Maps Directions
                route_info = get_route_polyline(
                    float(prev_loc.latitude), float(prev_loc.longitude),
                    float(loc.latitude), float(loc.longitude)
                )
                
                create_itinerary_route(
                    db, from_stop_id=prev_stop_id, to_stop_id=new_stop.stop_id,
                    travel_time=route_info.travel_time_min, distance=route_info.distance_km, polyline=route_info.polyline_data
                )
                current_dt += timedelta(minutes=route_info.travel_time_min)
                daily_time += route_info.travel_time_min
                
            prev_stop_id = new_stop.stop_id

            global_total_time += daily_time

        # 5. Cập nhật tổng thời gian chuyến đi (Có thể gọi crud để update)
        # update_itinerary_total_time(db, trip.itinerary_id, global_total_time)

    # Reload
    full_trip = get_itinerary_by_id(db, trip.itinerary_id)
    return ItineraryOut.model_validate(full_trip)


@router.get("/{itinerary_id}", response_model=ItineraryOut, summary="Xem chi tiết lộ trình")
def get_trip_detail(itinerary_id: str, db: Session = Depends(get_session)):
    trip = get_itinerary_by_id(db, itinerary_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")
    return ItineraryOut.model_validate(trip)


@router.post("/{stop_id}/checkin", response_model=CheckInResponse, summary="Check-in tại trạm")
def checkin_stop(
    stop_id: int, 
    request: CheckInRequest, 
    db: Session = Depends(get_session),
    current_user: dict = Depends(security.verify_token)
):
    user_id = get_current_user_id(db, current_user)
    
    stop = get_itinerary_stop(db, stop_id)
    if not stop:
        raise HTTPException(status_code=404, detail="Không tìm thấy trạm dừng")
        
    if stop.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Trạm này đã được check-in trước đó")
    # Query thêm location vì models.py chưa setup Relationship
    location = db.get(Locations, stop.location_id)
    # Kiểm tra bán kính
    is_within, distance = check_within_radius(
        request.latitude, request.longitude,
        float(location.latitude), float(location.longitude),
        radius_m=stop.checkin_radius
    )

    if not is_within:
        raise HTTPException(
            status_code=400,
            detail=f"Bạn cách trạm {distance:.0f}m. Cần ở trong phạm vi {stop.checkin_radius}m để check-in."
        )

    # Lưu log
    progress = mark_stop_completed(db, user_id, stop_id, request.latitude, request.longitude)

    return CheckInResponse(
        success=True,
        message=f"✅ Check-in thành công tại '{location.location_name}'!",
        stop_id=stop_id,
        progress_id=progress.progress_id
    )


@router.post("/tracking", response_model=DeviationAlert, summary="Gửi tọa độ GPS & Kiểm tra chệch hướng")
def track_user_location(
    request: TrackingRequest,
    db: Session = Depends(get_session),
    current_user: dict = Depends(security.verify_token)
):
    """
    Bắt tọa độ GPS từ Mobile. 
    Nếu User cách xa đường đi mặc định > 1km -> Trả về cảnh báo chệch hướng.
    """
    # 1. Lấy thông tin Stop hiện tại User đang hướng tới
    stop = get_itinerary_stop(db, request.current_stop_id)
    if not stop:
        raise HTTPException(status_code=404, detail="Không tìm thấy trạm dừng")
    
    location = db.get(Locations, stop.location_id)

    # 2. Tính khoảng cách tới trạm đó
    from core.algorithms import haversine
    dist_km = haversine(
        request.latitude, request.longitude,
        float(location.latitude), float(location.longitude)
    )

    # Logic cảnh báo: Nếu cách trạm > 5km (tùy chỉnh) khi đang trong hành trình
    is_deviated = dist_km > 5.0 
    
    return DeviationAlert(
        is_deviated=is_deviated,
        distance_to_target=round(dist_km * 1000, 2),
        message="Bạn đang đi đúng hướng" if not is_deviated else "Cảnh báo: Bạn đang đi lệch khỏi lộ trình!"
    )