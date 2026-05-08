# File mới: api/planning.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from uuid import UUID

from database import get_session
import core.security as security
import crud.crud_user as crud_user
from crud.crud_planning import create_planning_session, create_session_preferences
from schemas import PlanningSessionCreate, PlanningSessionResponse

router = APIRouter(prefix="/api/planning", tags=["Planning - Lên kế hoạch"])

def get_current_user_id(db: Session, current_user_dict: dict) -> UUID:
    """Helper: Lấy user_id thực tế từ Token."""
    email = current_user_dict.get("sub")
    user = crud_user.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại")
    return user.user_id

@router.post("/create", response_model=PlanningSessionResponse, summary="Khởi tạo phiên lập kế hoạch")
def create_planning(
    request: PlanningSessionCreate, 
    db: Session = Depends(get_session),
    # Giả định bạn có hàm get_current_user hoặc verify_token để lấy payload
    current_user: dict = Depends(security.verify_token)
):
    """
    Nhận dữ liệu từ TripInputForm (React) và lưu thành một Planning Session.
    """
    user_id = get_current_user_id(db, current_user)
    
    # 1. Lưu phiên xuống Database (truyền rã tham số thay vì cả object request)
    session_plan = create_planning_session(
        db=db, 
        user_id=user_id,
        city_id=request.city_id,
        pax_adult=request.pax_adult,
        pax_children=request.pax_children,
        budget=request.budget,
        currency=request.currency,
        start_day=request.start_day,
        end_day=request.end_day
    )
    # 2. Lưu danh sách tag sở thích (nếu user có chọn)
    if request.preferred_tags:
        create_session_preferences(db, session_plan.session_id, request.preferred_tags)
    
    # 3. Trả về thông tin phiên (bao gồm session_id) để Frontend đi tiếp sang bước Gợi ý
    return PlanningSessionResponse.model_validate(session_plan)