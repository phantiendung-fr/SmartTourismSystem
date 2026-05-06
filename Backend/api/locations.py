# ============================================================
# api/locations.py  –  Location suggestion & listing endpoints
# ============================================================

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from database import get_session
from core.algorithms import LocationCandidate, ScoringContext, score_locations
from crud import crud_location, crud_trip
from schemas import (
    LocationSuggestionItem,
    SuggestionRequest,
    SuggestionResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /suggest  –  Gợi ý địa điểm dựa trên Planning Session
# ---------------------------------------------------------------------------

@router.post("/suggest", response_model=SuggestionResponse)
def suggest_locations(
    body: SuggestionRequest,
    db: Session = Depends(get_session),
):
    """
    Gợi ý địa điểm phù hợp dựa trên Planning Session.

    Flow:
    1. Lấy planning session → city, budget, dates
    2. Lấy user preferences (tag weights + session tags)
    3. Query tất cả locations của city
    4. Scoring & ranking qua algorithms.score_locations()
    5. Return top N suggestions
    """
    # 1. Validate planning session
    session = crud_trip.get_planning_session(db, body.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Planning session {body.session_id} không tồn tại.",
        )

    # 2. Lấy locations của city
    locations = crud_location.get_locations_by_city(db, session.city_id)
    if not locations:
        return SuggestionResponse(
            session_id=body.session_id,
            suggestions=[],
            total=0,
        )

    # 3. Tính budget per stop (budget / (số ngày * ~3 stops/ngày))
    num_days = (session.end_day - session.start_day).days + 1
    estimated_stops_per_day = 3
    total_stops = max(1, num_days * estimated_stops_per_day)
    budget_per_stop = Decimal(str(float(session.budget) / total_stops))

    # 4. Lấy user preferences
    user_tag_weights = crud_location.get_user_tag_weights(db, session.user_id)
    session_tag_ids = crud_trip.get_session_preference_tag_ids(db, body.session_id)
    # Merge with request tag_ids
    all_session_tags = list(set(session_tag_ids + body.tag_ids))

    user_category_history = crud_location.get_user_category_history(db, session.user_id)

    # 5. Build candidates
    candidates: list[LocationCandidate] = []
    for loc in locations:
        tag_ids = crud_location.get_location_tag_ids(db, loc.location_id)
        tag_names = crud_location.get_location_tag_names(db, loc.location_id)
        cat_ids = crud_location.get_location_category_ids(db, loc.location_id)
        cat_names = crud_location.get_location_category_names(db, loc.location_id)
        stats = crud_location.get_location_stats(db, loc.location_id)

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
            tags=tag_ids,
            tag_names=tag_names,
            categories=cat_ids,
            category_names=cat_names,
            total_views=stats.total_views if stats else 0,
            total_checkins=stats.total_checkins if stats else 0,
        ))

    # 6. Score & rank
    context = ScoringContext(
        city_id=session.city_id,
        budget_per_stop=budget_per_stop,
        num_days=num_days,
        user_tag_weights=user_tag_weights,
        session_tag_ids=all_session_tags,
        category_frequency=user_category_history,
    )
    ranked = score_locations(candidates, context)

    # 7. Limit results
    top_results = ranked[: body.max_results]

    # 8. Build response
    suggestions = [
        LocationSuggestionItem(
            location_id=c.location_id,
            location_name=c.location_name,
            latitude=Decimal(str(c.latitude)),
            longitude=Decimal(str(c.longitude)),
            min_price=c.min_price,
            max_price=c.max_price,
            open_time=c.open_time,
            close_time=c.close_time,
            tags=c.tag_names,
            categories=c.category_names,
            score=c.score,
        )
        for c in top_results
    ]

    return SuggestionResponse(
        session_id=body.session_id,
        suggestions=suggestions,
        total=len(suggestions),
    )


# ---------------------------------------------------------------------------
# GET /{city_id}  –  Liệt kê tất cả locations theo city
# ---------------------------------------------------------------------------

@router.get("/city/{city_id}")
def list_locations_by_city(
    city_id: int,
    db: Session = Depends(get_session),
):
    """Lấy danh sách locations theo city_id."""
    city = crud_location.get_city_by_id(db, city_id)
    if not city:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"City {city_id} không tồn tại.",
        )

    locations = crud_location.get_locations_by_city(db, city_id)
    return {
        "city_id": city_id,
        "city_name": city.city_name,
        "locations": [
            {
                "location_id": loc.location_id,
                "location_name": loc.location_name,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "min_price": loc.min_price,
                "max_price": loc.max_price,
                "open_time": loc.open_time,
                "close_time": loc.close_time,
            }
            for loc in locations
        ],
        "total": len(locations),
    }


# ---------------------------------------------------------------------------
# GET /{location_id}/detail  –  Chi tiết 1 location
# ---------------------------------------------------------------------------

@router.get("/{location_id}/detail")
def get_location_detail(
    location_id: UUID,
    db: Session = Depends(get_session),
):
    """Lấy thông tin chi tiết của 1 location."""
    location = crud_location.get_location_by_id(db, location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} không tồn tại.",
        )

    tags = crud_location.get_location_tag_names(db, location_id)
    categories = crud_location.get_location_category_names(db, location_id)
    stats = crud_location.get_location_stats(db, location_id)
    images = crud_location.get_location_images(db, location_id)

    return {
        "location_id": location.location_id,
        "location_name": location.location_name,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "city_id": location.city_id,
        "open_time": location.open_time,
        "close_time": location.close_time,
        "min_price": location.min_price,
        "max_price": location.max_price,
        "tags": tags,
        "categories": categories,
        "stats": {
            "total_views": stats.total_views if stats else 0,
            "total_checkins": stats.total_checkins if stats else 0,
            "completion_rate": stats.completion_rate if stats else 0,
        },
        "images": [
            {"image_id": img.image_id, "url": img.url, "display_order": img.display_order}
            for img in images
        ],
    }