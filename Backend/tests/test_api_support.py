import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from routers.support import SupportChatRequest, chat_with_customer_support


def test_support_chat_api_returns_gemini_reply():
    support_service = AsyncMock()
    support_service.reply.return_value = "Bạn hãy mở mục Quên mật khẩu."

    with patch(
        "routers.support.get_customer_support_service",
        return_value=support_service,
    ):
        response = asyncio.run(
            chat_with_customer_support(
                SupportChatRequest(
                    message="Tôi không đăng nhập được",
                    history=[
                        {"role": "assistant", "content": "Bạn cần hỗ trợ gì?"}
                    ],
                )
            )
        )

    assert response.reply == "Bạn hãy mở mục Quên mật khẩu."
    assert response.suggestions
    support_service.reply.assert_awaited_once()


def test_support_chat_api_rejects_blank_message():
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(chat_with_customer_support(SupportChatRequest(message="   ")))

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Tin nhắn không được để trống."


def test_support_chat_api_rejects_oversized_message():
    with pytest.raises(ValidationError):
        SupportChatRequest(message="a" * 1001)


def test_support_chat_api_reports_unavailable_service():
    support_service = AsyncMock()
    support_service.reply.side_effect = ValueError("Missing Gemini key")

    with patch(
        "routers.support.get_customer_support_service",
        return_value=support_service,
    ):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(
                chat_with_customer_support(
                    SupportChatRequest(message="Tôi cần hỗ trợ")
                )
            )

    assert exc_info.value.status_code == 503
    assert "đang bận" in exc_info.value.detail
