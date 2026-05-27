"""
services/rate_limited_key_manager.py
─────────────────────────────────────
Mở rộng GeminiKeyManager với Sliding-Window Rate Limiter.

Tính năng:
  - Sliding-window RPM (15 req / 60 s) và RPD (1500 req / 24 h) cho mỗi key.
  - Hỗ trợ cool-down tạm thời (khi nhận lỗi 429 từ API).
  - Hỗ trợ vô hiệu hóa vĩnh viễn key lỗi (403 – invalid key).
  - Không busy-waiting: khi tất cả key đều hết quota, tính toán thời gian
    chờ chính xác rồi mới await asyncio.sleep().
  - Fully async-safe với một asyncio.Lock duy nhất.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Sequence

from services.gemini_key_manager import GeminiKeyManager

logger = logging.getLogger(__name__)

# ── Giới hạn mặc định của Gemini free-tier ──────────────────────────────────
DEFAULT_RPM = 15          # requests per minute
DEFAULT_RPD = 1_500       # requests per day
WINDOW_MINUTE = 60.0      # giây
WINDOW_DAY = 86_400.0     # giây


@dataclass
class _KeyState:
    """Trạng thái rate-limit của một API key."""

    key: str
    disabled: bool = False              # bị vô hiệu hóa (vd: 403)
    cool_until: float = 0.0             # timestamp hết cool-down (0 = chưa cool)

    # Sliding windows – chứa timestamps (float) của các request đã gửi
    minute_window: deque[float] = field(default_factory=deque)
    day_window: deque[float] = field(default_factory=deque)

    # ── Helpers ──────────────────────────────────────────────────────────────

    def purge_old(self, now: float) -> None:
        """Xoá timestamps cũ hơn cửa sổ thời gian tương ứng."""
        cutoff_min = now - WINDOW_MINUTE
        while self.minute_window and self.minute_window[0] <= cutoff_min:
            self.minute_window.popleft()

        cutoff_day = now - WINDOW_DAY
        while self.day_window and self.day_window[0] <= cutoff_day:
            self.day_window.popleft()

    def is_available(self, now: float, rpm: int, rpd: int) -> bool:
        """Kiểm tra key có thể dùng ngay không."""
        if self.disabled:
            return False
        if now < self.cool_until:
            return False
        self.purge_old(now)
        return len(self.minute_window) < rpm and len(self.day_window) < rpd

    def next_available_at(self, now: float, rpm: int, rpd: int) -> float:
        """
        Thời điểm sớm nhất key này có thể sử dụng lại.
        Trả về float('inf') nếu không bao giờ còn dùng được (disabled / hết RPD).
        """
        if self.disabled:
            return float("inf")

        self.purge_old(now)
        candidates: list[float] = []

        # Còn trong cool-down
        if now < self.cool_until:
            candidates.append(self.cool_until)

        # RPM đạt giới hạn → chờ đến khi request cũ nhất ra khỏi cửa sổ 60s
        if len(self.minute_window) >= rpm:
            candidates.append(self.minute_window[0] + WINDOW_MINUTE)

        # RPD đạt giới hạn → chờ đến khi request cũ nhất ra khỏi cửa sổ 24h
        if len(self.day_window) >= rpd:
            candidates.append(self.day_window[0] + WINDOW_DAY)

        return min(candidates) if candidates else now

    def record(self, now: float) -> None:
        """Ghi nhận một request mới vào cả hai cửa sổ."""
        self.minute_window.append(now)
        self.day_window.append(now)


class RateLimitedKeyManager(GeminiKeyManager):
    """
    Quản lý xoay vòng Gemini API key với sliding-window rate limiting.

    Ví dụ sử dụng:
        manager = RateLimitedKeyManager()

        key = await manager.acquire()
        try:
            result = await call_api(key, ...)
        except RateLimitError as exc:
            manager.report_rate_limited(key, retry_after=exc.retry_after)
        except InvalidKeyError:
            manager.disable_key(key)
        else:
            manager.release(key)
    """

    def __init__(
        self,
        keys: Sequence[str] | None = None,
        rpm: int = DEFAULT_RPM,
        rpd: int = DEFAULT_RPD,
    ) -> None:
        super().__init__(keys)
        self._rpm = rpm
        self._rpd = rpd
        self._lock = asyncio.Lock()
        self._states: dict[str, _KeyState] = {
            k: _KeyState(key=k) for k in self.all_keys
        }

    # ── Public API ────────────────────────────────────────────────────────────

    async def acquire(self) -> str:
        """
        Trả về key khả dụng tiếp theo (async-safe).

        Nếu tất cả key đều hết quota, hàm sẽ SLEEP chính xác thời gian cần
        thiết thay vì busy-wait, rồi thử lại tự động.

        Raises:
            RuntimeError: Tất cả key đều bị vô hiệu hóa vĩnh viễn.
        """
        while True:
            async with self._lock:
                now = time.monotonic()
                active_states = [
                    s for s in self._states.values() if not s.disabled
                ]
                if not active_states:
                    raise RuntimeError(
                        "Tất cả Gemini API key đều bị vô hiệu hóa (403/invalid). "
                        "Hãy bổ sung key mới vào .env."
                    )

                # Xoay vòng: tìm key khả dụng theo thứ tự round-robin
                n = len(active_states)
                for _ in range(n):
                    state = active_states[self._index % n]
                    self._index += 1
                    if state.is_available(now, self._rpm, self._rpd):
                        state.record(now)
                        logger.debug(
                            "[KeyManager] Cấp key ...%s (rpm=%d/%d, rpd=%d/%d)",
                            state.key[-6:],
                            len(state.minute_window),
                            self._rpm,
                            len(state.day_window),
                            self._rpd,
                        )
                        return state.key

                # Không có key nào sẵn → tính thời gian ngủ chính xác
                earliest = min(
                    s.next_available_at(now, self._rpm, self._rpd)
                    for s in active_states
                )

            # Ngủ bên ngoài lock để không chặn các coroutine khác
            wait = max(0.0, earliest - time.monotonic()) + 0.1   # thêm 100ms buffer
            logger.warning(
                "[KeyManager] Tất cả key đang bận. Đợi %.1f giây …", wait
            )
            await asyncio.sleep(wait)

    def release(self, key: str) -> None:
        """
        Gọi sau khi gọi API thành công – hiện không cần làm gì thêm vì
        timestamp đã được ghi nhận trong ``acquire()``.
        (Giữ lại cho tương thích API và mở rộng sau.)
        """

    def report_rate_limited(self, key: str, retry_after: float = 60.0) -> None:
        """
        Đánh dấu key bị rate-limit (lỗi 429). Key sẽ bị cool-down
        thêm ``retry_after`` giây kể từ hiện tại.
        """
        if key in self._states:
            cool_until = time.monotonic() + retry_after
            self._states[key].cool_until = cool_until
            logger.warning(
                "[KeyManager] Key ...%s bị 429 – cool-down thêm %.0f s.",
                key[-6:],
                retry_after,
            )

    def disable_key(self, key: str) -> None:
        """
        Vô hiệu hóa vĩnh viễn key (vd: lỗi 403 – key không hợp lệ).
        """
        if key in self._states:
            self._states[key].disabled = True
            logger.error(
                "[KeyManager] Key ...%s bị vô hiệu hóa (403/invalid).", key[-6:]
            )

    def stats(self) -> list[dict]:
        """Trả về thống kê trạng thái của tất cả key (dùng cho logging/debug)."""
        now = time.monotonic()
        result = []
        for s in self._states.values():
            s.purge_old(now)
            result.append(
                {
                    "key_suffix": f"...{s.key[-6:]}",
                    "disabled": s.disabled,
                    "cool_remaining": max(0.0, s.cool_until - now),
                    "rpm_used": len(s.minute_window),
                    "rpd_used": len(s.day_window),
                    "rpm_limit": self._rpm,
                    "rpd_limit": self._rpd,
                }
            )
        return result
