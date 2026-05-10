import random
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone 
from pydantic import BaseModel # Thêm thư viện này để tạo form nhận OTP

from database import get_session
import crud.crud_user as crud_user
import crud.crud_auth as crud_auth 
import schemas
from models import UserStatus
import core.security as security
from core.config import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Thay bằng Client ID của nhóm
GOOGLE_CLIENT_ID = "(Thay thế bằng Client ID của nhóm)"

router = APIRouter(tags=["Auth - Đăng nhập/Đăng ký"])

# ===========================================================================
# 1. CÁC CLASS NHẬN DỮ LIỆU TỪ FRONTEND CHO CHỨC NĂNG OTP
# ===========================================================================
class ForgotPasswordReq(BaseModel):
    email: str

class ResetPasswordReq(BaseModel):
    email: str
    otp: str
    new_password: str

# BỘ NHỚ TẠM ĐỂ LƯU OTP (Hết hạn sau 5 phút)
otp_storage = {}

# ===========================================================================
# 2. CÁC API XỬ LÝ AUTHENTICATION
# ===========================================================================

@router.post("/register")
def register(user_data: schemas.UserCreate, db: Session = Depends(get_session)):
    # 1. Kiểm tra user tồn tại
    existing_user = crud_auth.get_user_by_email(db, email=user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")
    
    # 2. Tạo user
    new_user = crud_user.create_user(
        db=db, 
        full_name=user_data.full_name, 
        email=user_data.email, 
        password=user_data.password,
        register_type=user_data.register_type, 
        role=user_data.role,
        status=UserStatus.ACTIVE
    )
    return {"message": "Đăng ký thành công", "email": new_user.email}

@router.post("/login", response_model=schemas.TokenResponse)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_session)):
    user = crud_auth.get_user_by_email(db, email=credentials.email)
    
    # Dùng UserStatus.ACTIVE thay vì string "ACTIVE"
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc bị khóa")

    if not security.verify_password(credentials.password, user.passwordhash):
        raise HTTPException(status_code=401, detail="Mật khẩu không chính xác")

    access_token = security.create_access_token(data={"sub": str(user.user_id), "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": str(user.user_id)})
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

@router.post("/google-login")
def google_login(token_data: dict, db: Session = Depends(get_session)):
    token = token_data.get("token")
    device_id = token_data.get("device_id", "Web-Browser")
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo['email']
        full_name = idinfo.get('name', 'Google User')
        social_id = idinfo['sub']

        user = crud_user.get_user_by_email(db, email=email)
        if not user:
            user = crud_user.create_social_user(db, full_name, email, social_id, "GOOGLE")
        
        user_role_str = getattr(user.role, 'value', user.role)

        access_token = security.create_access_token(data={"sub": user.email, "role": user_role_str})
        refresh_token = security.create_refresh_token(data={"sub": user.email})
        
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

@router.put("/update-profile")
def update_profile(
    data: dict, 
    current_user: dict = Depends(security.verify_token), 
    db: Session = Depends(get_session)
):
    user_id = current_user.get("sub")
    role = current_user.get("role") # Lấy role từ Token (USER hay ENTERPRISE)
    
    if "user_id" in data:
        del data["user_id"]
        
    # 🌟 "KẺ CHUYỂN MẠCH" Ở ĐÂY:
    if role == "ENTERPRISE":
        # Cập nhật vào bảng Doanh nghiệp
        updated_user = crud_user.update_enterprise_profile(db=db, user_id=user_id, **data)
    else:
        # Cập nhật vào bảng Cá nhân mặc định
        updated_user = crud_user.update_user_profile(db=db, user_id=user_id, **data)
    
    if not updated_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
        
    return {"message": "Cập nhật hồ sơ thành công!", "user": updated_user}
# ===========================================================================
# 3. CHỨC NĂNG QUÊN MẬT KHẨU (GỬI OTP VÀ ĐỔI PASS MỚI)
# ===========================================================================

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordReq, db: Session = Depends(get_session)):
    # 1. Kiểm tra email có tồn tại không
    user = crud_auth.get_user_by_email(db, email=req.email)
    if not user:
        raise HTTPException(status_code=404, detail="Email này chưa được đăng ký!")

    # 2. Sinh mã OTP ngẫu nhiên (6 chữ số)
    otp_code = str(random.randint(100000, 999999))

    # 3. Lưu OTP và thời gian hết hạn (5 phút) vào bộ nhớ tạm
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=5)
    otp_storage[req.email] = {"otp": otp_code, "expire_time": expire_time}

    # 4. In ra Terminal thay vì gửi Email thật để sinh viên dễ test
    print("\n" + "="*55)
    print(f"🚀 [HỆ THỐNG EMAIL TỰ ĐỘNG - DEMO]")
    print(f"📧 Đã gửi thư khôi phục đến: {req.email}")
    print(f"🔑 MÃ OTP CỦA BẠN LÀ: {otp_code}")
    print("="*55 + "\n")

    return {"message": "Mã OTP đã được tạo! Vui lòng mở Terminal Backend để lấy mã."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordReq, db: Session = Depends(get_session)):
    # 1. Kiểm tra xem email này có đang yêu cầu OTP không
    record = otp_storage.get(req.email)
    if not record:
        raise HTTPException(status_code=400, detail="Chưa gửi yêu cầu hoặc phiên đã bị hủy!")

    # 2. Kiểm tra mã OTP gửi lên có khớp không
    if record["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác!")

    # 3. Kiểm tra xem OTP có bị quá hạn 5 phút không
    if datetime.now(timezone.utc) > record["expire_time"]:
        del otp_storage[req.email]
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn!")

    # 4. Tìm User trong CSDL
    user = crud_auth.get_user_by_email(db, email=req.email)
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại!")

    # 5. Cập nhật mật khẩu mới (Băm mật khẩu trước khi lưu)
    user.passwordhash = security.get_password_hash(req.new_password)
    user.update_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.add(user)
    db.commit()

    # 6. Xóa OTP sau khi dùng thành công
    del otp_storage[req.email]

    return {"message": "Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ."}