# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from database import get_session
from schemas import SuggestionRequest, SuggestionResponse, LocationOut
from crud.crud_location import get_location_tags
from core.algorithms import score_location
from typing import Optional
from core.security import verify_token_optional
from models import Itineraries, ItineraryDays, ItineraryStops, StopStatus

router = APIRouter(prefix="/api/suggestions", tags=["Suggestion - Gợi ý địa điểm"])


def _location_to_out(db: Session, loc, score: Optional[float] = None, image_url: Optional[str] = None) -> LocationOut:
    tags_db = get_location_tags(db, loc.location_id)
    loc_tags = [t.tag_name for t in tags_db]
    loc_out = LocationOut.model_validate(loc)
    loc_out.tags = loc_tags
    loc_out.score = score
    loc_out.image_url = image_url
    return loc_out


@router.get("/cities/{city_id}/locations", response_model=SuggestionResponse, summary="Tất cả địa điểm trong thành phố")
def list_city_locations(
    city_id: int,
    search: str = Query(default="", max_length=100),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_session),
):
    from models import LocationsImage, Locations, Cities
    image_subquery = (
        db.query(LocationsImage.url)
        .filter(LocationsImage.location_id == Locations.location_id)
        .order_by(LocationsImage.display_order.asc())
        .limit(1)
        .correlate(Locations)
        .scalar_subquery()
    )

    locations_with_images = (
        db.query(Locations, image_subquery.label("image_url"))
        .join(Cities, Locations.city_id == Cities.city_id)
        .filter(
            Locations.city_id == city_id,
            Locations.is_active == True,
            Locations.deleted_at.is_(None),
        )
        .all()
    )

    keyword = search.strip().lower()
    if keyword:
        filtered = []
        for loc, image_url in locations_with_images:
            tags = [tag.tag_name for tag in get_location_tags(db, loc.location_id)]
            haystack = " ".join([
                loc.location_name or "",
                loc.address or "",
                " ".join(tags),
            ]).lower()
            if keyword in haystack:
                filtered.append((loc, image_url))
        locations_with_images = filtered

    locations_with_images = sorted(
        locations_with_images,
        key=lambda item: item[0].location_name.lower(),
    )[:limit]
    location_out = [_location_to_out(db, loc, image_url=image_url) for loc, image_url in locations_with_images]

    return SuggestionResponse(total=len(location_out), locations=location_out)

@router.post("/recommend", response_model=SuggestionResponse, summary="Gợi ý địa điểm phù hợp")
def recommend_locations(request: SuggestionRequest, db: Session = Depends(get_session), current_user: Optional[dict] = Depends(verify_token_optional)):
    # 0. Lấy danh sách địa điểm đã đi nếu có token
    visited_location_ids = set()
    if current_user:
        user_id = current_user.get("user_id")
        if user_id:
            completed_stops = db.query(ItineraryStops.location_id).join(
                ItineraryDays, ItineraryStops.day_id == ItineraryDays.day_id
            ).join(
                Itineraries, ItineraryDays.itinerary_id == Itineraries.itinerary_id
            ).filter(
                Itineraries.user_id == user_id,
                ItineraryStops.status == StopStatus.COMPLETED
            ).all()
            visited_location_ids = {str(stop.location_id) for stop in completed_stops}

    # 1. Lấy tất cả địa điểm của thành phố
    from models import LocationsImage, Locations, Cities
    image_subquery = (
        db.query(LocationsImage.url)
        .filter(LocationsImage.location_id == Locations.location_id)
        .order_by(LocationsImage.display_order.asc())
        .limit(1)
        .correlate(Locations)
        .scalar_subquery()
    )

    statement = (
        db.query(Locations, image_subquery.label("image_url"))
        .join(Cities, Locations.city_id == Cities.city_id)
        .filter(
            Locations.city_id == request.city_id,
            Locations.is_active == True,
            Locations.deleted_at.is_(None),
        )
    )
    locations_with_images = statement.all()

    if not locations_with_images:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy địa điểm nào tại thành phố có ID {request.city_id}")

    # 2 & 3. Chấm điểm từng địa điểm
    scored_locations = []
    for loc, image_url in locations_with_images:
        # Gọi DB để lấy tag thay vì dùng property (vì models.py chưa khai báo Relationship)
        tags_db = get_location_tags(db, loc.location_id)
        loc_tags = [t.tag_name for t in tags_db]

        score = score_location(
            location_min_price=float(loc.min_price),
            location_max_price=float(loc.max_price),
            location_tags=loc_tags,
            user_budget=float(request.budget),
            user_preferred_tags=request.preferred_tags,
        )

        # None = bị loại bởi ràng buộc cứng
        if score is not None:
            # 3.5. Hạ độ ưu tiên nếu địa điểm đã đi qua
            if str(loc.location_id) in visited_location_ids:
                score -= 0.5
                
            loc_out = _location_to_out(db, loc, score, image_url=image_url)
            scored_locations.append(loc_out)

    # 4. Sắp xếp theo score giảm dần
    scored_locations.sort(key=lambda x: x.score or 0, reverse=True)

    # 5. Giới hạn số lượng
    scored_locations = scored_locations[: request.max_results]

    return SuggestionResponse(
        total=len(scored_locations),
        locations=scored_locations,
    )
