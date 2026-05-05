"""
Core Algorithms – Thuật toán gợi ý và xây dựng lộ trình.

Module này KHÔNG phụ thuộc database.
Input/Output là plain Python objects → dễ test, dễ migrate.
"""

import math
from typing import List, Tuple, Optional


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Tính khoảng cách giữa 2 tọa độ GPS (km) bằng công thức Haversine.

    Args:
        lat1, lon1: Tọa độ điểm 1
        lat2, lon2: Tọa độ điểm 2

    Returns:
        Khoảng cách tính bằng km
    """
    R = 6371.0  # Bán kính Trái Đất (km)

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def compute_tag_similarity(
    user_tags: List[str], location_tags: List[str]
) -> float:
    """
    Tính độ tương đồng sở thích bằng Jaccard Similarity.

    Jaccard = |A ∩ B| / |A ∪ B|
    Trả về giá trị từ 0.0 (không khớp) đến 1.0 (khớp hoàn toàn).
    """
    if not user_tags or not location_tags:
        return 0.0

    set_user = set(tag.lower().strip() for tag in user_tags)
    set_loc = set(tag.lower().strip() for tag in location_tags)

    intersection = set_user & set_loc
    union = set_user | set_loc

    if not union:
        return 0.0

    return len(intersection) / len(union)


def score_location(
    location_cost_level: int,
    location_rating: float,
    location_tags: List[str],
    user_budget_level: int,
    user_preferred_tags: List[str],
) -> Optional[float]:
    """
    Chấm điểm 1 địa điểm dựa trên preferences của user.

    Ràng buộc cứng (Hard constraints):
        - cost_level > budget_level → LOẠI BỎ (return None)

    Ràng buộc mềm (Soft constraints) – Scoring:
        - Tag matching (Jaccard similarity):  trọng số 0.6
        - Rating:                             trọng số 0.4

    Returns:
        Score từ 0-100, hoặc None nếu bị loại bỏ bởi ràng buộc cứng
    """
    # --- Ràng buộc cứng ---
    if location_cost_level > user_budget_level:
        return None  # Quá ngân sách → loại

    # --- Ràng buộc mềm ---
    # 1. Tag similarity (0 → 1)
    tag_score = compute_tag_similarity(user_preferred_tags, location_tags)

    # 2. Rating score (chuẩn hóa về 0-1, giả sử rating tối đa 5.0)
    rating_score = min(location_rating / 5.0, 1.0)

    # Tổng hợp với trọng số
    WEIGHT_TAG = 0.6
    WEIGHT_RATING = 0.4

    final_score = (tag_score * WEIGHT_TAG + rating_score * WEIGHT_RATING) * 100

    return round(final_score, 2)


def estimate_travel_time(
    lat1: float, lon1: float, lat2: float, lon2: float,
    speed_kmh: float = 40.0
) -> float:
    """
    Ước lượng thời gian di chuyển giữa 2 điểm (phút).

    Giả sử tốc độ trung bình 40 km/h (đi trong thành phố).
    """
    distance = haversine(lat1, lon1, lat2, lon2)
    if speed_kmh <= 0:
        return 0.0
    time_hours = distance / speed_kmh
    return round(time_hours * 60, 1)  # Đổi sang phút


def check_within_radius(
    user_lat: float,
    user_lon: float,
    target_lat: float,
    target_lon: float,
    radius_km: float = 0.1,
) -> Tuple[bool, float]:
    """
    Kiểm tra user có nằm trong bán kính cho phép của 1 trạm không.
    Dùng cho check-in.

    Args:
        radius_km: Bán kính chấp nhận check-in (mặc định 100m)

    Returns:
        (is_within, distance_km)
    """
    distance = haversine(user_lat, user_lon, target_lat, target_lon)
    return distance <= radius_km, round(distance, 3)