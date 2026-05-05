# Định nghĩa các bảng SQL (Users, Locations, Trips,...).
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database import Base  # <--- ĐÂY LÀ DÒNG BỊ THIẾU ĐÂY NÀY

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255))
    passwordhash = Column(String(255), nullable=False) 
    email = Column(String(255), unique=True, index=True, nullable=False)
    social_id = Column(String(255), nullable=True)
    register_type = Column(String(50), default="EMAIL")
    role = Column(String(50), default="USER")
    status = Column(String(20), default="ACTIVE")
    create_at = Column(DateTime(timezone=True), server_default=func.now())
    update_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

class UserSession(Base):
    __tablename__ = "user_sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    device_id = Column(String(255))
    refresh_token_hash = Column(String(500))
    is_revoked = Column(Boolean, default=False) 
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())