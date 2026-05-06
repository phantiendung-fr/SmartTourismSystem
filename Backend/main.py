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
    # NOTE: On Supabase production, tables are managed via schema.sql.
    # Calling create_db_and_tables() is safe for local dev only.
    create_db_and_tables()
    yield
    # Shutdown logic (e.g., close background tasks) goes here


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
    allow_origins=["*"],        # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Routers (add your feature routers here)
# ============================================================

from api.locations import router as locations_router
from api.trips import router as trips_router

app.include_router(locations_router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(trips_router, prefix="/api/v1/itineraries", tags=["Itineraries"])


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
    return create_user(db=db, user_in=user)
# ============================================================
# Run locally: uvicorn main:app --reload
# ============================================================
