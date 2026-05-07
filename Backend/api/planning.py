# File mới: api/planning.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from uuid import UUID

from database import get_session
import core.security as security
import crud.crud_user as crud_user
from crud.crud_planning import create_planning_session
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
    current_user: dict = Depends(security.decode_access_token) 
):
    """
    Nhận dữ liệu từ TripInputForm (React) và lưu thành một Planning Session.
    """
    user_id = get_current_user_id(db, current_user)
    
    # 1. Lưu phiên xuống Database
    session_plan = create_planning_session(db, user_id, request)
    
    # 2. Trả về thông tin phiên (bao gồm session_id) để Frontend đi tiếp sang bước Gợi ý
    return PlanningSessionResponse.model_validate(session_plan)