from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone # Thêm các thư viện xử lý thời gian

from database import get_session
import crud.crud_user as crud_user
import crud.crud_auth as crud_auth # THÊM IMPORT NÀY
import schemas
import core.security as security
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Thay bằng Client ID của nhóm
GOOGLE_CLIENT_ID = "(Thay thế bằng Client ID của nhóm)"

router = APIRouter()

@router.post("/register")
def register(user_data: schemas.UserCreate, db: Session = Depends(get_session)):
    # 1. Kiểm tra user tồn tại (giữ nguyên)
    existing_user = crud_auth.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")
    
    # 2. Sửa đoạn này: Truyền thêm register_type và ép status thành "ACTIVE"
    new_user = crud_user.create_user(
        db, 
        full_name=user_data.full_name, 
        email=user_data.email, 
        password=user_data.password,
        register_type=user_data.register_type, # Lấy từ Frontend gửi lên (EMAIL)
        role=user_data.role,
        status="ACTIVE"                        # Đổi từ PENDING thành ACTIVE để login được ngay
    )
    return {"message": "Đăng ký thành công", "email": new_user.email}

@router.post("/login", response_model=schemas.TokenResponse)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_session)):
    # 1. Dùng crud_auth thay vì crud_user
    user = crud_auth.get_user_by_email(db, email=credentials.email)
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc bị khóa")

    if not security.verify_password(credentials.password, user.passwordhash):
        raise HTTPException(status_code=401, detail="Mật khẩu không chính xác")

    # 2. Sửa "sub" thành string của user_id (để chuẩn với TokenPayload trong schemas)
    access_token = security.create_access_token(data={"sub": str(user.user_id), "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": str(user.user_id)})

    # 3. Tính toán expires_at cho refresh_token (Ví dụ: 7 ngày)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)

    # 4. Sửa thành crud_auth và thêm các biến còn thiếu
    crud_auth.create_user_session(
        db=db, 
        user_id=user.user_id, 
        device_id="web-browser", # Gán cứng tạm thời vì Schema chưa có trường này
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

# ---------------------------------------------------------------------------
# Đăng nhập bằng Google
# ---------------------------------------------------------------------------
@router.post("/google-login")
def google_login(token_data: dict, db: Session = Depends(get_session)):
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
        
        # Lấy giá trị chuỗi của role (VD: từ UserRole.USER thành "USER")
        user_role_str = getattr(user.role, 'value', user.role)

        # Tạo Token của hệ thống
        access_token = security.create_access_token(data={"sub": user.email, "role": user_role_str})
        refresh_token = security.create_refresh_token(data={"sub": user.email})
        
        # Lưu session
        crud_user.create_user_session(db, user.user_id, device_id, refresh_token)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": user_role_str,
            "full_name": user.full_name
        }
    except ValueError:
        raise HTTPException(status_code=401, detail="Xác thực Google thất bại")


@router.post("/logout")
def logout(refresh_token: str = Header(..., alias="Authorization-Refresh"), db: Session = Depends(get_session)): # <--- SỬA get_db THÀNH get_session Ở ĐÂY
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