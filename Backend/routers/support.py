"""Customer support chatbot API."""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from uuid import UUID
from database import get_session
from core.security import verify_token
import schemas
from crud.crud_feedback import create_user_feedback, get_user_feedbacks
from models import UserFeedbacks
from pydantic import BaseModel, Field

from services.customer_support_service import get_customer_support_service
from services.photo_service import GeminiError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/support", tags=["Customer Support"])

DEFAULT_SUGGESTIONS = [
    "Tôi không đăng nhập được",
    "Cách lập kế hoạch chuyến đi",
    "Ảnh check-in không được duyệt",
]


class SupportHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2_000)


class SupportChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1_000)
    history: list[SupportHistoryMessage] = Field(default_factory=list, max_length=10)


class SupportChatResponse(BaseModel):
    reply: str
    suggestions: list[str]


@router.post("/chat", response_model=SupportChatResponse)
async def chat_with_customer_support(request: SupportChatRequest) -> SupportChatResponse:
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Tin nhắn không được để trống.")

    try:
        reply = await get_customer_support_service().reply(
            message=message,
            history=[item.model_dump() for item in request.history],
        )
    except (GeminiError, RuntimeError, ValueError) as exc:
        logger.warning("[CustomerSupport] Gemini unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Trợ lý AI đang bận. Vui lòng thử lại sau ít phút.",
        ) from exc
    except Exception as exc:
        logger.exception("[CustomerSupport] Unexpected chatbot error")
        raise HTTPException(
            status_code=503,
            detail="Không thể kết nối trợ lý hỗ trợ lúc này.",
        ) from exc

    return SupportChatResponse(reply=reply, suggestions=DEFAULT_SUGGESTIONS)


@router.post("/tickets", response_model=schemas.FeedbackResponse)
def create_support_ticket(
    request: schemas.FeedbackCreate,
    db: Session = Depends(get_session),
    current_user: dict = Depends(verify_token)
) -> UserFeedbacks:
    """Gửi yêu cầu hỗ trợ mới đến Admin."""
    user_id_str = current_user.get("sub") or current_user.get("user_id")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc thiếu User ID.")
    try:
        user_id = UUID(str(user_id_str))
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID không hợp lệ.")
    
    return create_user_feedback(db, user_id, request.feedback_type, request.content)


@router.get("/tickets", response_model=list[schemas.FeedbackResponse])
def list_support_tickets(
    db: Session = Depends(get_session),
    current_user: dict = Depends(verify_token)
) -> list[UserFeedbacks]:
    """Lấy danh sách yêu cầu hỗ trợ đã gửi của người dùng hiện tại."""
    user_id_str = current_user.get("sub") or current_user.get("user_id")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc thiếu User ID.")
    try:
        user_id = UUID(str(user_id_str))
    except ValueError:
        raise HTTPException(status_code=400, detail="User ID không hợp lệ.")
    
    return get_user_feedbacks(db, user_id)

