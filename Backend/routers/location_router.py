from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from database import get_session
from core.dependencies import require_enterprise_active # IMPORT TỪ ĐÂY
from schemas import LocationCreate, LocationRegisterResponse
from services.location_service import register_location

router = APIRouter()

# ---------------------------------------------------------------------------
# POST /locations/register  –  Đăng ký địa điểm kinh doanh mới
# ---------------------------------------------------------------------------

@router.post(
    "/locations/register",
    response_model=LocationRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký địa điểm kinh doanh",
    description=(
        "Doanh nghiệp đã được duyệt (ENTERPRISE + ACTIVE) đăng ký một địa điểm "
        "kinh doanh mới. Địa chỉ sẽ được Geocode tự động qua Google Maps API. "
        "Địa điểm sau khi tạo ở trạng thái PENDING — chờ Admin xét duyệt."
    ),
    tags=["Locations"],
)
def register_location_endpoint(
    data: LocationCreate,
    payload: dict = Depends(require_enterprise_active), # Gài chốt bảo vệ
    db: Session = Depends(get_session),
) -> LocationRegisterResponse:
    
    user_id = UUID(str(payload.get("sub")))
    return register_location(db=db, user_id=user_id, data=data)