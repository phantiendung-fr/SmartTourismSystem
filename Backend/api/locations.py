"""
API Router – Module Suggestion (Gợi ý địa điểm).

Endpoint nhận dữ liệu đã chuẩn hóa từ Input Processing
→ chấm điểm (scoring) → trả danh sách xếp hạng.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import SuggestionRequest, SuggestionResponse, LocationOut
from crud.crud_trip import get_locations_by_city
from core.algorithms import score_location

router = APIRouter(prefix="/api/suggestions", tags=["Suggestion - Gợi ý địa điểm"])


@router.post(
    "/recommend",
    response_model=SuggestionResponse,
    summary="Gợi ý địa điểm phù hợp",
    description="""
    **Module Suggestion** – Nhận preferences đã chuẩn hóa, thực hiện:
    1. Query địa điểm theo thành phố
    2. Áp dụng ràng buộc cứng (cost_level ≤ budget_level) → loại bỏ
    3. Áp dụng ràng buộc mềm (tag matching + rating) → xếp hạng
    4. Trả danh sách sắp xếp theo score giảm dần
    """,
)
async def recommend_locations(
    request: SuggestionRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Lấy tất cả địa điểm của thành phố
    locations = await get_locations_by_city(db, request.city)

    if not locations:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy địa điểm nào tại '{request.city}'"
        )

    # 2 & 3. Chấm điểm từng địa điểm
    scored_locations = []
    for loc in locations:
        loc_tags = loc.tags if isinstance(loc.tags, list) else []

        score = score_location(
            location_cost_level=loc.cost_level,
            location_rating=loc.rating,
            location_tags=loc_tags,
            user_budget_level=request.budget_level,
            user_preferred_tags=request.preferred_tags,
        )

        # None = bị loại bởi ràng buộc cứng
        if score is not None:
            loc_out = LocationOut.model_validate(loc)
            loc_out.score = score
            scored_locations.append(loc_out)

    # 4. Sắp xếp theo score giảm dần
    scored_locations.sort(key=lambda x: x.score or 0, reverse=True)

    # Giới hạn số lượng
    scored_locations = scored_locations[: request.max_results]

    return SuggestionResponse(
        total=len(scored_locations),
        locations=scored_locations,
    )