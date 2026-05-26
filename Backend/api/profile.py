from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date

# Khởi tạo Router cho Profile
router = APIRouter()

# Khai báo "Khuôn mẫu" (Schema) để hứng chính xác dữ liệu từ React gửi lên
class UserProfileUpdate(BaseModel):
    user_id: str # UUID của user
    full_name: str
    date_of_birth: date
    gender: str
    base_location: Optional[str] = None
    travel_style: Optional[str] = None
    privacy_status: str
    bio: Optional[str] = None

# Mở cổng API nhận dữ liệu
@router.post("/update")
def update_user_profile(profile: UserProfileUpdate):
    try:
        # --- Logic kết nối Database (SQLAlchemy) sẽ nằm ở đây ---
        
        return {
            "status": "success", 
            "message": "Đã nhận dữ liệu hồ sơ thành công!"
        }
    except Exception:
        raise HTTPException(status_code=400, detail="Dữ liệu hồ sơ không hợp lệ")
