# ============================================================
# schemas.py  –  Pydantic v2 request / response schemas
# Maps to SQLModel tables defined in models.py
# ============================================================

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import (
    CurrencyEnum,
    GenderEnum,
    ItineraryStatus,
    KycStatus,
    PlanningStatus,
    PrivacyStatus,
    RegisterType,
    TravelStyle,
    UserRole,
    UserStatus,
)


# ============================================================
# USER SCHEMAS
# ============================================================

class UserCreate(BaseModel):
    """Payload for registering a new user."""
    email: EmailStr
    password: str = Field(min_length=8, description="Mật khẩu tối thiểu 8 ký tự")
    full_name: str = Field(max_length=100)
    register_type: RegisterType = RegisterType.EMAIL


class UserLogin(BaseModel):
    """Payload for authenticating an existing user."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """
    Public user representation – **never** exposes ``passwordhash``.
    Uses ``from_attributes`` so it can be built directly from a
    ``Users`` SQLModel instance.
    """
    user_id: UUID
    full_name: str
    email: str
    social_id: Optional[str] = None
    register_type: RegisterType
    role: UserRole
    status: UserStatus
    create_at: datetime
    update_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# AUTH / JWT SCHEMAS
# ============================================================

class Token(BaseModel):
    """Returned after successful login."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Decoded JWT payload."""
    sub: UUID                          # user_id
    exp: Optional[int] = None          # expiry (unix timestamp)
    role: Optional[UserRole] = None


# ============================================================
# PLANNING SESSION SCHEMAS
# ============================================================

class PlanningSessionCreate(BaseModel):
    """Payload for creating a new planning session (trip request)."""
    city_id: int
    start_day: date
    end_day: date
    budget: Decimal = Field(gt=0, decimal_places=2)
    currency: CurrencyEnum = CurrencyEnum.VND
    pax_adult: int = Field(default=1, gt=0)
    pax_children: int = Field(default=0, ge=0)


class PlanningSessionResponse(BaseModel):
    """Basic planning session info returned to the client."""
    session_id: UUID
    user_id: UUID
    city_id: int
    pax_adult: int
    pax_children: int
    budget: Decimal
    currency: CurrencyEnum
    start_day: date
    end_day: date
    status: PlanningStatus
    create_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# ITINERARY SCHEMAS
# ============================================================

class ItineraryCreate(BaseModel):
    """
    Minimal payload to kick‑off itinerary generation.
    The heavy lifting (stops, routes) is handled server‑side.
    """
    city_id: int
    start_day: date
    end_day: date
    budget: Decimal = Field(gt=0, decimal_places=2)


class ItineraryResponse(BaseModel):
    """Basic itinerary information returned to the client."""
    itinerary_id: UUID
    session_id: UUID
    user_id: UUID
    name: Optional[str] = None
    status: ItineraryStatus
    total_budget: Decimal
    currency: CurrencyEnum
    total_travel_time: int
    total_distance: Decimal
    create_at: datetime
    update_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# GENERIC MESSAGE SCHEMA
# ============================================================

class MessageResponse(BaseModel):
    """Generic API message (e.g. for delete / status endpoints)."""
    detail: str


# ============================================================
# SUGGESTION SCHEMAS
# ============================================================

class SuggestionRequest(BaseModel):
    """Yêu cầu gợi ý địa điểm dựa trên Planning Session."""
    session_id: UUID
    tag_ids: list[int] = []          # Tag preferences bổ sung (optional)
    max_results: int = Field(default=20, le=50)


class LocationSuggestionItem(BaseModel):
    """Một địa điểm được gợi ý, kèm điểm ranking."""
    location_id: UUID
    location_name: str
    latitude: Decimal
    longitude: Decimal
    min_price: Decimal
    max_price: Decimal
    open_time: time
    close_time: time
    tags: list[str] = []
    categories: list[str] = []
    score: float

    model_config = ConfigDict(from_attributes=True)


class SuggestionResponse(BaseModel):
    """Danh sách địa điểm được gợi ý."""
    session_id: UUID
    suggestions: list[LocationSuggestionItem]
    total: int


# ============================================================
# ITINERARY BUILD SCHEMAS
# ============================================================

class ItineraryBuildRequest(BaseModel):
    """Yêu cầu xây dựng lộ trình từ danh sách locations đã chọn."""
    session_id: UUID
    location_ids: list[UUID]


class StopDetail(BaseModel):
    """Chi tiết một điểm dừng trong lộ trình."""
    location_id: UUID
    location_name: str
    stop_order: int
    arrival_time: time
    departure_time: time
    latitude: Decimal
    longitude: Decimal


class RouteSegment(BaseModel):
    """Thông tin đoạn đường giữa 2 stops."""
    from_stop_order: int
    to_stop_order: int
    travel_time: int            # phút
    distance: Decimal           # km
    polyline_data: str


class DayPlan(BaseModel):
    """Kế hoạch cho 1 ngày trong lộ trình."""
    day_order: int
    travel_date: date
    stops: list[StopDetail]
    routes: list[RouteSegment]
    estimated_budget: Decimal
    total_time: int             # phút


class ItineraryBuildResponse(BaseModel):
    """Phản hồi sau khi xây dựng lộ trình."""
    itinerary_id: UUID
    session_id: UUID
    name: Optional[str] = None
    days: list[DayPlan]
    total_budget: Decimal
    total_travel_time: int
    total_distance: Decimal

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# TRACKING SCHEMAS
# ============================================================

class GPSUpdate(BaseModel):
    """GPS update từ client."""
    latitude: Decimal
    longitude: Decimal


class TrackingStatusResponse(BaseModel):
    """Phản hồi trạng thái tracking."""
    is_on_route: bool
    deviation_distance_m: Optional[float] = None
    current_stop_id: Optional[int] = None
    next_stop_id: Optional[int] = None
    message: str


class CheckinRequest(BaseModel):
    """Yêu cầu check-in tại một stop."""
    stop_id: int
    latitude: Decimal
    longitude: Decimal


class CheckinResponse(BaseModel):
    """Phản hồi check-in."""
    is_completed: bool
    message: str
    reward: Optional[int] = None
