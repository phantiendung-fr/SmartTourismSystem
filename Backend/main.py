# File chạy chính của server, khởi tạo các route
# File chạy chính của server, khởi tạo các route
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Thêm dòng import này
from database import engine, Base
from api import auth

# SQLAlchemy kết nối với Supabase và tự động tạo bảng (users, user_sessions)
Base.metadata.create_all(bind=engine)

# Khởi tạo ứng dụng FastAPI
app = FastAPI(title="Travel App API", version="1.0.0")

# Middleware này giống như ông bảo vệ, cho phép các domain khác (như localhost:3000) đi qua cổng
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các lệnh GET, POST, PUT, DELETE...
    allow_headers=["*"],  # Cho phép tất cả các loại dữ liệu gửi kèm
)

# Nhúng bộ API Đăng ký/Đăng nhập/Đăng xuất đã viết vào hệ thống
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# Tạo một API cơ bản ở trang chủ để test xem server có sống hay không
@app.get("/")
def root():
    return {"message": "Server đang chạy ngon lành! Hãy truy cập /docs để test API."}