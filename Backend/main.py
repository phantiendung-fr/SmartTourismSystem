# File chạy chính của server, khởi tạo các route
from fastapi import FastAPI
from database import engine, Base
from api import auth

# SQLAlchemy kết nối với Supabase và tự động tạo bảng (users, user_sessions)
Base.metadata.create_all(bind=engine)

# Khởi tạo ứng dụng FastAPI
app = FastAPI(title="Travel App API", version="1.0.0")

# Nhúng bộ API Đăng ký/Đăng nhập/Đăng xuất đã viết vào hệ thống
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# Tạo một API cơ bản ở trang chủ để test xem server có sống hay không
@app.get("/")
def root():
    return {"message": "Server đang chạy ngon lành! Hãy truy cập /docs để test API."}