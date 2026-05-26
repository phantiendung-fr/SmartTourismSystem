"""
main.py - FastAPI application entrypoint
Backend: FastAPI | Database: Supabase (PostgreSQL) | ORM: SQLModel
"""

import sys
# Reconfigure stdout to use UTF-8 on Windows
sys.stdout.reconfigure(encoding='utf-8')

from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from database import create_db_and_tables


# ============================================================
# Lifespan: startup / shutdown events
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before accepting requests."""
    try:
        print("Dang kiem tra ket noi Database...")
        create_db_and_tables()
        print("Ket noi Database va khoi tao bang thanh cong!")
        
        # Tự động seed dữ liệu thành tựu mặc định
        from sqlmodel import Session
        from database import engine
        from api.achievements import seed_default_achievements
        from api.gamification_seeding import seed_default_gamification_shop
        with Session(engine) as session:
            seed_default_achievements(session)
            seed_default_gamification_shop(session)
        print("Khoi tao du lieu thanh tuu va shop gamification thanh cong!")
    except Exception as e:
        print(f"LOI KET NOI DATABASE: {str(e)}")
        print("Canh bao: Server van chay nhung cac chuc nang lien quan den DB se loi.")
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
    allow_origins=settings.cors_origins_list,
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

from routers import auth, enterprise, location_router, gamification, task_router, social_quest, hidden_quest, enterprise_event, explore, community, admin
from api import planning, locations, trips, reference, leaderboard, achievements

app.include_router(auth.router, prefix="/api/auth")
app.include_router(enterprise.router, prefix="/api")
app.include_router(location_router.router, prefix="/api/v1")
app.include_router(gamification.router)
app.include_router(task_router.router, prefix="/api/v1")
app.include_router(social_quest.router)
app.include_router(planning.router)
app.include_router(locations.router)
app.include_router(trips.router)
app.include_router(reference.router)
app.include_router(leaderboard.router)
app.include_router(achievements.router)
app.include_router(hidden_quest.router)
app.include_router(enterprise_event.router)

# Đăng ký các routers mới cho Admin, Social Feed & Chat, Proxy Maps
app.include_router(explore.router)
app.include_router(community.router)
app.include_router(admin.router)


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
# pyrefly: ignore [missing-import]
from fastapi import Depends
# pyrefly: ignore [missing-import]
from sqlmodel import Session
from database import get_session
from crud.crud_user import create_user
from schemas import UserCreate

@app.post("/test-create-user", tags=["Test"])
def test_db(user: UserCreate, db: Session = Depends(get_session)):
    if settings.ENVIRONMENT.lower() != "development":
        raise HTTPException(status_code=404, detail="Not found")
    return create_user(
        db=db,
        full_name=user.full_name,
        email=user.email,
        password=user.password
    )
# ============================================================
# Run locally: uvicorn main:app --reload
# ============================================================
