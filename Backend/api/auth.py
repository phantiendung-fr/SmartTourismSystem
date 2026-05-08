from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database import get_session
from jose import jwt

import crud.crud_user as crud_user
import schemas
from models import UserStatus
import core.security as security
from core.config import settings

router = APIRouter(tags=["Auth - Đăng nhập/Đăng ký"])

@router.post("/register")
def register(user_data: schemas.UserCreate, db: Session = Depends(get_session)):
    # Kiểm tra email trùng lặp
    existing_user = crud_user.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")
    
    new_user = crud_user.create_user(
        db=db, 
        full_name=user_data.full_name, 
        email=user_data.email, 
        password=user_data.password
    )
    return {"message": "Đăng ký thành công", "email": new_user.email}

@router.post("/login")
def login(credentials: schemas.UserLogin, db: Session = Depends(get_session)):
    user = crud_user.get_user_by_email(db, email=credentials.email)
    
    # Dùng UserStatus.ACTIVE thay vì string "ACTIVE"
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc bị khóa")

    if not security.verify_password(credentials.password, user.passwordhash):
        raise HTTPException(status_code=401, detail="Mật khẩu không chính xác")

    access_token = security.create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": user.email})

    # schemas.UserLogin chưa có trường device_id, nên mình lấy mặc định nếu không có
    device_id = getattr(credentials, 'device_id', 'unknown-device')
    crud_user.create_user_session(db, user.user_id, device_id, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name or "User"
    }

@router.post("/logout")
def logout(refresh_token: str = Header(..., alias="Authorization-Refresh"), db: Session = Depends(get_session)):
    try:
        # Giải mã refresh token để lấy email
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        
        user = crud_user.get_user_by_email(db, email)
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