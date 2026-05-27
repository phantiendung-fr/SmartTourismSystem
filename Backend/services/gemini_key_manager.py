"""
services/gemini_key_manager.py
──────────────────────────────
Quản lý xoay vòng Gemini API key theo Round-Robin.

Tính năng:
  - Load tất cả key từ biến môi trường GEMINI_API_KEY_1 … GEMINI_API_KEY_N
    hoặc GEMINI_API_KEYS (danh sách phân tách bằng dấu phẩy).
  - Fallback về GEMINI_API_KEY / GOOGLE_API_KEY nếu không có gì khác.
  - Xoay vòng vô tận, an toàn với asyncio (dùng asyncio.Lock).

Usage:
  from services.gemini_key_manager import GeminiKeyManager
  manager = GeminiKeyManager()
  key = await manager.get_next_key()
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Sequence

logger = logging.getLogger(__name__)


class GeminiKeyManager:
    """Round-Robin key manager cho Gemini API – async-safe."""

    def __init__(self, keys: Sequence[str] | None = None) -> None:
        self._keys: list[str] = list(keys) if keys else self._load_keys_from_env()
        if not self._keys:
            raise ValueError(
                "Không tìm thấy Gemini API key nào. "
                "Hãy đặt GEMINI_API_KEY, GEMINI_API_KEYS, "
                "hoặc GEMINI_API_KEY_1 … trong file .env."
            )
        self._index: int = 0
        self._lock = asyncio.Lock()
        logger.info(
            "[GeminiKeyManager] Đã tải %d key (ẩn 6 ký tự cuối: %s).",
            len(self._keys),
            [f"...{k[-6:]}" for k in self._keys],
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_next_key(self) -> str:
        """Trả về key kế tiếp theo vòng Round-Robin."""
        async with self._lock:
            key = self._keys[self._index % len(self._keys)]
            self._index += 1
            return key

    @property
    def key_count(self) -> int:
        """Tổng số key hiện có."""
        return len(self._keys)

    @property
    def all_keys(self) -> list[str]:
        """Danh sách tất cả key (dùng nội bộ / test)."""
        return list(self._keys)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _load_keys_from_env() -> list[str]:
        """
        Ưu tiên theo thứ tự:
        1. GEMINI_API_KEY_1, GEMINI_API_KEY_2, … (đánh số)
        2. GEMINI_API_KEYS  (phân cách bằng dấu phẩy)
        3. GEMINI_API_KEY   (key đơn lẻ)
        4. GOOGLE_API_KEY   (key đơn lẻ – fallback)
        """
        keys: list[str] = []

        # 1. Đánh số: GEMINI_API_KEY_1 … GEMINI_API_KEY_N
        i = 1
        while True:
            val = os.getenv(f"GEMINI_API_KEY_{i}", "").strip()
            if not val:
                break
            keys.append(val)
            i += 1

        if keys:
            return keys

        # 2. Danh sách phân tách bằng dấu phẩy
        multi = os.getenv("GEMINI_API_KEYS", "")
        if multi:
            keys = [k.strip() for k in multi.split(",") if k.strip()]
            if keys:
                return keys

        # 3. Key đơn lẻ
        for env_var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
            val = os.getenv(env_var, "").strip()
            if val:
                return [val]

        return []
