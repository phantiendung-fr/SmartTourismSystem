"""
gamification.py (Router)
========================
Định nghĩa các API Endpoints cho hệ thống Gamification của ứng dụng.
Kết nối trực tiếp với các hàm xử lý logic từ module crud_gamification.
Cung cấp các route cho: nhận quà tân thủ, điểm danh, truy vấn rương báu gần đây, 
nhặt rương báu, xem bảng xếp hạng và các địa điểm 'hot'.
"""

import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from database import get_session
from crud import crud_gamification as crud

router = APIRouter(
    prefix="/api/gamification",
    tags=["Gamification"],
)

class ClaimTreasureRequest(BaseModel):
    spawn_id: uuid.UUID
    item_id: Optional[int] = None

@router.post("/claim-newbie-gift/{user_id}")
def api_claim_newbie_gift(user_id: uuid.UUID, session: Session = Depends(get_session)):
    claimed = crud.check_newbie_gift(session, user_id)
    if claimed:
        raise HTTPException(status_code=400, detail="Newbie gift already claimed")
    
    success = crud.claim_newbie_gift(session, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to claim newbie gift")
    
    return {"status": "success", "message": "Newbie gift claimed successfully"}

@router.post("/daily-attendance/{user_id}")
def api_daily_attendance(user_id: uuid.UUID, session: Session = Depends(get_session)):
    result = crud.daily_attendance(session, user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"status": "success", "data": result}

@router.get("/nearby-treasures/{user_id}")
def api_get_nearby_treasures(user_id: uuid.UUID, session: Session = Depends(get_session)):
    treasures = crud.get_nearby_treasures(session, user_id)
    return {"status": "success", "data": treasures}

@router.post("/claim-treasure/{user_id}")
def api_claim_treasure(user_id: uuid.UUID, request: ClaimTreasureRequest, session: Session = Depends(get_session)):
    try:
        success = crud.claim_treasure(session, user_id, request.spawn_id, request.item_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to claim treasure")
        return {"status": "success", "message": "Treasure claimed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leaderboard")
def api_get_leaderboard(city_id: int, period_type: str, period_value: str, session: Session = Depends(get_session)):
    leaderboard = crud.get_leaderboard(session, city_id, period_type, period_value)
    return {"status": "success", "data": leaderboard}

@router.get("/hot-locations")
def api_get_hot_locations(session: Session = Depends(get_session)):
    locations = crud.get_hot_locations(session)
    return {"status": "success", "data": locations}
