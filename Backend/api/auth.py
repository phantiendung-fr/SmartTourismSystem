# Xử lý Đăng nhập, Đăng ký, Đăng xuất, Phân quyền
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database import get_db

import crud.crud_user as crud_user
import schemas
import core.security as security
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Thay bằng Client ID của nhóm
GOOGLE_CLIENT_ID = "(Thay thế bằng Client ID của nhóm)"

router = APIRouter()

@router.post("/register")
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Kiểm tra email trùng lặp
    existing_user = crud_user.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")
    
    new_user = crud_user.create_user(db, user_data.full_name, user_data.email, user_data.password)
    return {"message": "Đăng ký thành công", "email": new_user.email}

@router.post("/login", response_model=schemas.TokenResponse)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud_user.get_user_by_email(db, email=credentials.email)
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc bị khóa")

    if not security.verify_password(credentials.password, user.passwordhash):
        raise HTTPException(status_code=401, detail="Mật khẩu không chính xác")

    access_token = security.create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": user.email})

    crud_user.create_user_session(db, user.user_id, credentials.device_id, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name or "User"
    }

@router.post("/google-login")
def google_login(token_data: dict, db: Session = Depends(get_db)):
    token = token_data.get("token")
    device_id = token_data.get("device_id", "Web-Browser")
    try:
        # Xác minh token với Google
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo['email']
        full_name = idinfo.get('name', 'Google User')
        social_id = idinfo['sub']

        # Kiểm tra user
        user = crud_user.get_user_by_email(db, email=email)
        if not user:
            user = crud_user.create_social_user(db, full_name, email, social_id, "GOOGLE")
        
        # Tạo Token của hệ thống
        access_token = security.create_access_token(data={"sub": user.email, "role": user.role})
        refresh_token = security.create_refresh_token(data={"sub": user.email})
        
        # Lưu session
        crud_user.create_user_session(db, user.user_id, device_id, refresh_token)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": user.role,
            "full_name": user.full_name
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Xác thực Google thất bại")

@router.post("/logout")
def logout(refresh_token: str = Header(..., alias="Authorization-Refresh"), db: Session = Depends(get_db)):
    success = crud_user.revoke_session(db, refresh_token=refresh_token)
    if not success:
        raise HTTPException(status_code=400, detail="Phiên không hợp lệ hoặc đã đăng xuất")
    return {"message": "Đăng xuất thành công"}

# API test hệ thống phân quyền (Chỉ user đã đăng nhập mới gọi được)
@router.get("/me")
def get_my_profile(current_user: dict = Depends(security.verify_token)):
    return {
        "message": "Bạn đã vượt qua chốt kiểm tra quyền!",
        "user_email": current_user.get("sub"),
        "role": current_user.get("role")
    }