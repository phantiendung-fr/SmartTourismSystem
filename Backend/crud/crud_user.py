# Query lấy thông tin user, kiểm tra đăng nhập.
from sqlalchemy.orm import Session
import models
from datetime import datetime, timedelta
from core.security import get_password_hash

def get_user_by_email(db: Session, email: str):
    # Dùng ilike để không phân biệt chữ hoa/thường
    return db.query(models.User).filter(models.User.email.ilike(email)).first()

def create_user(db: Session, full_name: str, email: str, password: str):
    hashed_password = get_password_hash(password)
    new_user = models.User(
        full_name=full_name,
        email=email,
        passwordhash=hashed_password,
        role="USER",
        status="ACTIVE"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def create_user_session(db: Session, user_id: str, device_id: str, refresh_token: str):
    expire_date = datetime.utcnow() + timedelta(days=7)
    db_session = models.UserSession(
        user_id=user_id,
        device_id=device_id,
        refresh_token_hash=refresh_token, 
        is_revoked=False,
        expires_at=expire_date
    )
    db.add(db_session)
    db.commit()
    return db_session

def revoke_session(db: Session, refresh_token: str):
    session = db.query(models.UserSession).filter(
        models.UserSession.refresh_token_hash == refresh_token,
        models.UserSession.is_revoked == False
    ).first()
    if session:
        session.is_revoked = True
        db.commit()
        return True
    return False

def create_social_user(db: Session, full_name: str, email: str, social_id: str, register_type: str):
    new_user = models.User(
        full_name=full_name,
        email=email,
        social_id=social_id,
        register_type=register_type,
        role="USER",
        status="ACTIVE"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user