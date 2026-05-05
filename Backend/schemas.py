# Định nghĩa dữ liệu đầu vào/đầu ra (Ràng buộc điều khoản đăng nhập/đăng ký).
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    device_id: Optional[str] = "mobile_app"

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str  
    token_type: str = "bearer"
    role: str
    full_name: str