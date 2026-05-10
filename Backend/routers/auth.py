from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone # Thêm các thư viện xử lý thời gian

from database import get_session
import crud.crud_user as crud_user
import crud.crud_auth as crud_auth # THÊM IMPORT NÀY
import schemas
from models import UserStatus
import core.security as security
from core.config import settings

router = APIRouter(tags=["Auth - Đăng nhập/Đăng ký"])

@router.post("/register")
def register(user_data: schemas.UserCreate, db: Session = Depends(get_session)):
    # Dùng crud_auth để tìm user (vì hàm này nằm trong crud_auth.py)
    existing_user = crud_auth.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")
    
    # crud_user chứa hàm tạo user mới
    new_user = crud_user.create_user(
        db=db, 
        full_name=user_data.full_name, 
        email=user_data.email, 
        password=user_data.password,
        status=UserStatus.ACTIVE
    )
    return {"message": "Đăng ký thành công", "email": new_user.email}

@router.post("/login", response_model=schemas.TokenResponse)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_session)):
    # 1. Dùng crud_auth thay vì crud_user
    user = crud_auth.get_user_by_email(db, email=credentials.email)
    
    # Dùng UserStatus.ACTIVE thay vì string "ACTIVE"
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc bị khóa")

    if not security.verify_password(credentials.password, user.passwordhash):
        raise HTTPException(status_code=401, detail="Mật khẩu không chính xác")

    # 2. Sửa "sub" thành string của user_id (để chuẩn với TokenPayload trong schemas)
    access_token = security.create_access_token(data={"sub": str(user.user_id), "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": str(user.user_id)})

    # 3. Tính toán expires_at cho refresh_token (Ví dụ: 7 ngày)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)

    # 4. Sửa thành crud_auth và thêm các biến còn thiếu
    device_id = getattr(credentials, 'device_id', 'unknown-device')
    crud_auth.create_user_session(
        db=db, 
        user_id=user.user_id, 
        device_id=device_id,
        refresh_token_hash=refresh_token,
        expires_at=expires_at
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name or "User"
    }

# Các hàm phía dưới (logout, get_my_profile) giữ nguyên

@router.post("/logout")
def logout(refresh_token: str = Header(..., alias="Authorization-Refresh"), db: Session = Depends(get_session)):
    try:
        # Giải mã refresh token để lấy user_id
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        
        user = db.get(crud_user.Users, user_id_str)
        if not user:
            raise HTTPException(status_code=401, detail="User không tồn tại")
            
        success = crud_user.revoke_session(db, user.user_id, refresh_token)
        if not success:
            raise HTTPException(status_code=400, detail="Phiên không hợp lệ hoặc đã đăng xuất")
            
        return {"message": "Đăng xuất thành công"}
    except Exception:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn")

@router.get("/me")
def get_my_profile(current_user: dict = Depends(security.verify_token)):
    return {
        "message": "Bạn đã vượt qua chốt kiểm tra quyền!",
        "user_email": current_user.get("sub"),
        "role": current_user.get("role")
    }