"""
main.py - FastAPI application entrypoint
Backend: FastAPI | Database: Supabase (PostgreSQL) | ORM: SQLModel
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables


# ============================================================
# Lifespan: startup / shutdown events
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before accepting requests."""
    try:
        print("🔍 Đang kiểm tra kết nối Database...")
        create_db_and_tables()
        print("✅ Kết nối Database và khởi tạo bảng thành công!")
    except Exception as e:
        print(f"❌ LỖI KẾT NỐI DATABASE: {str(e)}")
        print("⚠️ Cảnh báo: Server vẫn chạy nhưng các chức năng liên quan đến DB sẽ lỗi.")
    yield


# ============================================================
# App instance
# ============================================================

app = FastAPI(
    title="Du Lịch Thông Minh Việt Nam",
    description="Smart Travel Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# ============================================================
# CORS Middleware
# ============================================================

app.add_middleware(
    CORSMiddleware,
    # Sửa ["*"] thành đích danh cổng 3000 và 3001
    allow_origins=["http://localhost:3000", "http://localhost:3001"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Routers (add your feature routers here)
# ============================================================

# Example:
# from routers import users, locations, itineraries
# app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
# app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
# app.include_router(itineraries.router, prefix="/api/v1/itineraries", tags=["Itineraries"])
from routers import auth, enterprise, location_router
from api import planning, locations, trips

app.include_router(auth.router, prefix="/api/auth")
app.include_router(enterprise.router, prefix="/api")
app.include_router(location_router.router, prefix="/api/v1")
app.include_router(planning.router)
app.include_router(locations.router)
app.include_router(trips.router)

# ============================================================
# Health check
# ============================================================

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Du Lịch Thông Minh Việt Nam API is running"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}

# Code thêm vào để test tính năng module data
from fastapi import Depends
from sqlmodel import Session
from database import get_session
from crud.crud_user import create_user
from schemas import UserCreate

@app.post("/test-create-user", tags=["Test"])
def test_db(user: UserCreate, db: Session = Depends(get_session)):
    return create_user(
        db=db,
        full_name=user.full_name,
        email=user.email,
        password=user.password
    )
# ============================================================
# Run locally: uvicorn main:app --reload
# ============================================================
