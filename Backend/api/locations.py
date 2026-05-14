# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from database import get_session
from schemas import SuggestionRequest, SuggestionResponse, LocationOut
from crud.crud_location import get_locations_by_city, get_location_tags
from core.algorithms import score_location

router = APIRouter(prefix="/api/suggestions", tags=["Suggestion - Gợi ý địa điểm"])

@router.post("/recommend", response_model=SuggestionResponse, summary="Gợi ý địa điểm phù hợp")
def recommend_locations(request: SuggestionRequest, db: Session = Depends(get_session)):
    # 1. Lấy tất cả địa điểm của thành phố
    locations = get_locations_by_city(db, request.city_id)

    if not locations:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy địa điểm nào tại thành phố có ID {request.city_id}")

    # 2 & 3. Chấm điểm từng địa điểm
    scored_locations = []
    for loc in locations:
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
            # Pydantic sẽ tự động map các field nhờ từ khóa from_attributes=True
            loc_out = LocationOut.model_validate(loc)
            loc_out.tags = loc_tags
            loc_out.score = score
            scored_locations.append(loc_out)

    # 4. Sắp xếp theo score giảm dần
    scored_locations.sort(key=lambda x: x.score or 0, reverse=True)

    # 5. Giới hạn số lượng
    scored_locations = scored_locations[: request.max_results]

    return SuggestionResponse(
        total=len(scored_locations),
        locations=scored_locations,
    )