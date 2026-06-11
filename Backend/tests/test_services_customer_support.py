import asyncio
from unittest.mock import AsyncMock, patch

from services.customer_support_service import CustomerSupportService, build_support_prompt


def test_build_support_prompt_marks_history_as_untrusted():
    prompt = build_support_prompt(
        "Tôi không đăng nhập được",
        [
            {"role": "user", "content": "Quên mật khẩu"},
            {"role": "assistant", "content": "Hãy dùng chức năng khôi phục"},
        ],
    )

    assert "<HOI_THOAI_KHONG_DANG_TIN_CAY>" in prompt
    assert "Khách hàng: Quên mật khẩu" in prompt
    assert "Trợ lý: Hãy dùng chức năng khôi phục" in prompt
    assert prompt.endswith("</HOI_THOAI_KHONG_DANG_TIN_CAY>")


def test_customer_support_service_reuses_gemini_text_generation():
    gemini_service = AsyncMock()
    gemini_service.generate_text.return_value = "  Bạn hãy chọn Quên mật khẩu.  "

    with patch(
        "services.customer_support_service.get_photo_service",
        return_value=gemini_service,
    ):
        reply = asyncio.run(CustomerSupportService().reply("Tôi quên mật khẩu"))

    assert reply == "Bạn hãy chọn Quên mật khẩu."
    gemini_service.generate_text.assert_awaited_once()
    prompt = gemini_service.generate_text.await_args.args[0]
    assert "Tôi quên mật khẩu" in prompt
