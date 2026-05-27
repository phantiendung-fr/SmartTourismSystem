"""
services/photo_service.py
──────────────────────────
Giao tiếp với Gemini Vision REST API cho tính năng phân tích ảnh.

Tính năng:
  - Singleton `GeminiPhotoService` tích hợp với RateLimitedKeyManager.
  - Thử lần lượt nhiều model (gemini-2.5-flash → 2.5-flash-lite → 2.5-pro → 2.0-flash).
  - Xử lý lỗi chi tiết theo mã HTTP:
      429 → cool-down key, xoay sang key khác
      403 → vô hiệu hóa key, xoay sang key khác
      400/404 → lỗi không thể phục hồi, dừng ngay
      5xx/Timeout → exponential backoff
  - Tối đa MAX_TOTAL_ATTEMPTS lần gọi API (mặc định 7).
  - Không busy-waiting; mọi wait đều qua asyncio.sleep().

Usage:
    from services.photo_service import get_photo_service
    svc = get_photo_service()
    text = await svc.generate_text(prompt, image_bytes_list, mime_types)
"""

from __future__ import annotations

import asyncio
import base64
import logging
import re
from typing import Sequence

import httpx

from services.rate_limited_key_manager import RateLimitedKeyManager

logger = logging.getLogger(__name__)

# ── Hằng số cấu hình ─────────────────────────────────────────────────────────
MAX_TOTAL_ATTEMPTS = 7          # tổng số lần thử (gộp cả đổi key + retry)
SERVER_BACKOFF_BASE = 2.0       # giây (cho lỗi 5xx)
SERVER_BACKOFF_MAX = 30.0       # giây
REQUEST_TIMEOUT = 60.0          # giây

# Model theo thứ tự ưu tiên (api_version, model_name)
_API_MODELS: list[tuple[str, str]] = [
    ("v1", "gemini-2.5-flash"),
    ("v1", "gemini-2.5-flash-lite-preview-06-17"),
    ("v1", "gemini-2.5-pro"),
    ("v1", "gemini-2.0-flash-001"),
]

_GEMINI_BASE = "https://generativelanguage.googleapis.com"


class GeminiError(Exception):
    """Lỗi từ Gemini API."""


class GeminiRateLimitError(GeminiError):
    """HTTP 429 – key đang bị rate-limit."""
    def __init__(self, message: str, retry_after: float = 60.0) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class GeminiInvalidKeyError(GeminiError):
    """HTTP 403 – key không hợp lệ hoặc bị thu hồi."""


class GeminiClientError(GeminiError):
    """HTTP 400/404 – lỗi client (payload/model sai); không thử lại."""


class GeminiServerError(GeminiError):
    """HTTP 5xx hoặc timeout – thử lại với backoff."""


class GeminiPhotoService:
    """
    Dịch vụ gửi yêu cầu phân tích ảnh tới Gemini Vision API.

    Tham số:
        key_manager: Instance RateLimitedKeyManager (singleton bên ngoài).
        generation_config: Override cấu hình generation mặc định.
    """

    def __init__(
        self,
        key_manager: RateLimitedKeyManager,
        generation_config: dict | None = None,
    ) -> None:
        self._km = key_manager
        self._generation_config = generation_config or {
            "temperature": 0.2,
            "maxOutputTokens": 1024,
        }

    # ── Public API ─────────────────────────────────────────────────────────────

    async def generate_text(
        self,
        prompt: str,
        image_bytes_list: Sequence[bytes],
        mime_types: Sequence[str] | None = None,
    ) -> str:
        """
        Gửi prompt + danh sách ảnh tới Gemini, trả về text phản hồi.

        Args:
            prompt: Nội dung văn bản.
            image_bytes_list: Danh sách ảnh cần gửi kèm (bytes).
            mime_types: MIME type tương ứng; tự động detect nếu None.

        Returns:
            Chuỗi text phản hồi từ model.

        Raises:
            GeminiError: Sau khi đã cạn hết MAX_TOTAL_ATTEMPTS.
            RuntimeError: Tất cả key bị vô hiệu hóa.
        """
        resolved_mimes = [
            (mime_types[i] if mime_types and i < len(mime_types) else _detect_mime(img))
            for i, img in enumerate(image_bytes_list)
        ]
        payload = self._build_payload(prompt, image_bytes_list, resolved_mimes)
        return await self._call_with_retry(payload)

    # ── Private helpers ────────────────────────────────────────────────────────

    def _build_payload(
        self,
        prompt: str,
        image_bytes_list: Sequence[bytes],
        mime_types: list[str],
    ) -> dict:
        parts: list[dict] = [{"text": prompt}]
        for img, mime in zip(image_bytes_list, mime_types):
            parts.append({
                "inline_data": {
                    "mime_type": mime,
                    "data": base64.b64encode(img).decode(),
                }
            })
        return {
            "contents": [{"parts": parts}],
            "generationConfig": self._generation_config,
        }

    async def _call_with_retry(self, payload: dict) -> str:
        """
        Vòng lặp retry chính:
          - Lấy key từ manager (đã tích hợp chờ đúng thời gian).
          - Thử lần lượt từng model.
          - Xử lý lỗi theo loại.
        """
        last_error: Exception = GeminiError("Không rõ lỗi.")
        backoff = SERVER_BACKOFF_BASE

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            for attempt in range(1, MAX_TOTAL_ATTEMPTS + 1):
                key = await self._km.acquire()

                for api_ver, model in _API_MODELS:
                    url = (
                        f"{_GEMINI_BASE}/{api_ver}/models/"
                        f"{model}:generateContent?key={key}"
                    )
                    try:
                        resp = await client.post(url, json=payload)
                    except httpx.TimeoutException as exc:
                        last_error = GeminiServerError(
                            f"Timeout khi gọi {model} (attempt {attempt})"
                        )
                        logger.warning(str(last_error))
                        break  # thử attempt tiếp theo (đổi key)
                    except httpx.RequestError as exc:
                        last_error = GeminiServerError(
                            f"Lỗi kết nối {model}: {exc}"
                        )
                        logger.warning(str(last_error))
                        break

                    # ── Xử lý mã HTTP ────────────────────────────────────────
                    if resp.status_code == 200:
                        text = _extract_text(resp.json())
                        if text is not None:
                            self._km.release(key)
                            return text
                        # Model trả về rỗng → thử model tiếp theo
                        last_error = GeminiError(
                            f"Gemini ({model}) trả về response rỗng."
                        )
                        continue

                    elif resp.status_code == 429:
                        retry_after = _parse_retry_after(resp.text)
                        self._km.report_rate_limited(key, retry_after)
                        last_error = GeminiRateLimitError(
                            f"Key ...{key[-6:]} bị rate-limit (429).",
                            retry_after,
                        )
                        logger.warning(str(last_error))
                        break  # đổi key, thử attempt tiếp theo

                    elif resp.status_code == 403:
                        self._km.disable_key(key)
                        last_error = GeminiInvalidKeyError(
                            f"Key ...{key[-6:]} không hợp lệ (403)."
                        )
                        logger.error(str(last_error))
                        break  # đổi key, thử attempt tiếp theo

                    elif resp.status_code in (400, 404):
                        err_msg = _extract_error_message(resp)
                        last_error = GeminiClientError(
                            f"HTTP {resp.status_code} từ {model}: {err_msg}"
                        )
                        logger.error(str(last_error))
                        # 400/404 → payload hoặc model sai, thử model kế tiếp
                        # (nhưng dừng hẳn nếu tất cả model đều 404)
                        continue

                    else:  # 5xx và các lỗi khác
                        err_msg = _extract_error_message(resp)
                        last_error = GeminiServerError(
                            f"HTTP {resp.status_code} từ {model}: {err_msg}"
                        )
                        logger.warning(str(last_error))
                        # Áp dụng exponential backoff cho server error
                        await asyncio.sleep(min(backoff, SERVER_BACKOFF_MAX))
                        backoff = min(backoff * 2, SERVER_BACKOFF_MAX)
                        break  # đổi key/model, thử attempt tiếp theo

                else:
                    # Tất cả model đều thất bại trong attempt này → thử lại
                    logger.warning(
                        "[PhotoService] Attempt %d/%d: tất cả model thất bại.",
                        attempt,
                        MAX_TOTAL_ATTEMPTS,
                    )

        raise GeminiError(
            f"Gemini API thất bại sau {MAX_TOTAL_ATTEMPTS} lần thử. "
            f"Lỗi cuối: {last_error}"
        )


# ── Module-level helpers ──────────────────────────────────────────────────────

def _detect_mime(image_bytes: bytes) -> str:
    """Nhận dạng MIME type từ magic bytes."""
    if image_bytes[:4] == b"\x89PNG":
        return "image/png"
    if image_bytes[:2] == b"\xff\xd8":
        return "image/jpeg"
    if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "image/webp"
    if image_bytes[:3] == b"GIF":
        return "image/gif"
    return "image/jpeg"  # mặc định


def _extract_text(response_json: dict) -> str | None:
    """Trích xuất text từ Gemini response JSON; trả về None nếu rỗng."""
    try:
        parts = (
            response_json["candidates"][0]["content"]["parts"]
        )
        text = parts[0].get("text", "").strip()
        return text if text else None
    except (KeyError, IndexError):
        return None


def _extract_error_message(resp: httpx.Response) -> str:
    """Trích xuất message lỗi từ response (JSON hoặc plain text)."""
    try:
        return resp.json().get("error", {}).get("message", resp.text[:300])
    except Exception:
        return resp.text[:300]


def _parse_retry_after(response_text: str, default: float = 60.0) -> float:
    """
    Trích xuất thời gian retry từ body lỗi 429.
    Gemini thường trả về dạng: "Retry after X seconds" hoặc "retryDelay: Xs".
    """
    match = re.search(r"retry[^\d]*(\d+(?:\.\d+)?)\s*s", response_text, re.IGNORECASE)
    if match:
        return min(float(match.group(1)) + 2.0, 120.0)
    return default


# ── Singleton factory ─────────────────────────────────────────────────────────

_service_instance: GeminiPhotoService | None = None


def get_photo_service() -> GeminiPhotoService:
    """
    Trả về singleton GeminiPhotoService.
    Khởi tạo RateLimitedKeyManager khi gọi lần đầu.
    """
    global _service_instance
    if _service_instance is None:
        _service_instance = GeminiPhotoService(
            key_manager=RateLimitedKeyManager()
        )
    return _service_instance
