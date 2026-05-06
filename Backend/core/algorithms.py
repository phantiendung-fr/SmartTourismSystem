# ============================================================
# core/algorithms.py  –  Thuật toán gợi ý địa điểm và tối ưu lộ trình
#
# 1. Location Scoring: Chấm điểm & xếp hạng địa điểm phù hợp
# 2. Route Optimization: DP Bitmask TSP (chính xác) / Nearest-Neighbor (fallback)
# ============================================================

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, time, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from core.google_maps import (
    get_distance_and_duration,
    get_route_polyline,
    DistanceResult,
    RouteResult,
)


# ============================================================
# Data structures
# ============================================================

@dataclass
class LocationCandidate:
    """Một địa điểm ứng viên cho gợi ý."""
    location_id: UUID
    location_name: str
    latitude: float
    longitude: float
    city_id: int
    open_time: time
    close_time: time
    min_price: Decimal
    max_price: Decimal
    tags: list[int] = field(default_factory=list)         # tag_id list
    tag_names: list[str] = field(default_factory=list)
    categories: list[int] = field(default_factory=list)   # category_id list
    category_names: list[str] = field(default_factory=list)
    total_views: int = 0
    total_checkins: int = 0
    score: float = 0.0


@dataclass
class ScoringContext:
    """Ngữ cảnh cho thuật toán scoring."""
    city_id: int
    budget_per_stop: Decimal            # Ngân sách trung bình cho mỗi stop
    num_days: int
    # User preference weights: {tag_id: weight (0.0–1.0)}
    user_tag_weights: dict[int, float] = field(default_factory=dict)
    # Session-selected tag_ids (ràng buộc bổ sung)
    session_tag_ids: list[int] = field(default_factory=list)
    # Category visit frequency: {category_id: visit_count}
    category_frequency: dict[int, int] = field(default_factory=dict)


@dataclass
class OptimizedStop:
    """Stop sau khi tối ưu thứ tự."""
    location_id: UUID
    location_name: str
    latitude: float
    longitude: float
    order: int              # Thứ tự trong route
    day: int                # Ngày thứ mấy (1-based)
    arrival_time: time
    departure_time: time
    min_price: Decimal
    max_price: Decimal


@dataclass
class RouteSegmentResult:
    """Thông tin 1 đoạn đường giữa 2 stops."""
    from_order: int
    to_order: int
    distance_km: float
    travel_time_min: int
    polyline_data: str


@dataclass
class OptimizedRoute:
    """Kết quả tối ưu lộ trình."""
    stops: list[OptimizedStop]
    routes: list[RouteSegmentResult]
    total_distance_km: float
    total_travel_time_min: int


# ============================================================
# 1. LOCATION SCORING ALGORITHM
# ============================================================

def score_locations(
    candidates: list[LocationCandidate],
    context: ScoringContext,
) -> list[LocationCandidate]:
    """
    Chấm điểm và xếp hạng các địa điểm.

    Quy trình:
    1. Ràng buộc cứng (FILTER) – loại bỏ hoàn toàn:
       - Không thuộc đúng city_id
       - min_price > budget_per_stop
    2. Ràng buộc mềm (SCORE 0.0–1.0) – xếp hạng:
       - Tag matching score    (weight: 0.4)
       - Category frequency    (weight: 0.3)
       - Popularity score      (weight: 0.2)
       - Price attractiveness  (weight: 0.1)

    Returns danh sách sorted giảm dần theo score.
    """
    # --- Step 1: Hard constraints (filter) ---
    filtered: list[LocationCandidate] = []
    for loc in candidates:
        # Phải đúng city
        if loc.city_id != context.city_id:
            continue
        # min_price phải nằm trong budget
        if loc.min_price > context.budget_per_stop:
            continue
        filtered.append(loc)

    if not filtered:
        return []

    # --- Step 2: Soft constraints (scoring) ---
    # Pre-compute max values for normalisation
    max_views = max((loc.total_views for loc in filtered), default=1) or 1
    max_checkins = max((loc.total_checkins for loc in filtered), default=1) or 1
    max_category_freq = max(context.category_frequency.values(), default=1) or 1
    budget_f = float(context.budget_per_stop)

    for loc in filtered:
        # -- Tag matching score (0.0–1.0) --
        tag_score = _compute_tag_score(
            loc.tags, context.user_tag_weights, context.session_tag_ids
        )

        # -- Category frequency score (0.0–1.0) --
        cat_score = _compute_category_score(
            loc.categories, context.category_frequency, max_category_freq
        )

        # -- Popularity score (0.0–1.0) --
        pop_score = _compute_popularity_score(
            loc.total_views, loc.total_checkins, max_views, max_checkins
        )

        # -- Price attractiveness (0.0–1.0) --
        # Giá càng rẻ so với budget → score càng cao
        price_score = 0.0
        if budget_f > 0:
            price_ratio = float(loc.min_price) / budget_f
            price_score = max(0.0, 1.0 - price_ratio)

        # Weighted sum
        loc.score = round(
            0.4 * tag_score
            + 0.3 * cat_score
            + 0.2 * pop_score
            + 0.1 * price_score,
            4,
        )

    # Sort giảm dần
    filtered.sort(key=lambda x: x.score, reverse=True)
    return filtered


def _compute_tag_score(
    location_tags: list[int],
    user_weights: dict[int, float],
    session_tags: list[int],
) -> float:
    """
    Tính tag matching score.

    - Nếu location có tag trùng với session_tags → +0.5 mỗi tag (normalised)
    - Nếu location có tag có trong user_weights → cộng weight tương ứng
    """
    if not location_tags:
        return 0.0

    total = 0.0
    count = 0

    for tag_id in location_tags:
        if tag_id in session_tags:
            total += 0.5
            count += 1
        if tag_id in user_weights:
            total += user_weights[tag_id]
            count += 1

    if count == 0:
        return 0.0
    # Normalise to 0.0–1.0
    return min(1.0, total / max(count, 1))


def _compute_category_score(
    location_categories: list[int],
    category_frequency: dict[int, int],
    max_freq: int,
) -> float:
    """Tính category frequency score – user hay ghé thăm category này → điểm cao hơn."""
    if not location_categories or not category_frequency:
        return 0.0

    total = 0.0
    for cat_id in location_categories:
        freq = category_frequency.get(cat_id, 0)
        total += freq / max_freq

    return min(1.0, total / len(location_categories))


def _compute_popularity_score(
    views: int, checkins: int, max_views: int, max_checkins: int,
) -> float:
    """Tính popularity score – kết hợp views và checkins."""
    v = views / max_views if max_views else 0
    c = checkins / max_checkins if max_checkins else 0
    return 0.6 * v + 0.4 * c


# ============================================================
# 2. ROUTE OPTIMIZATION – DP Bitmask TSP
# ============================================================

def optimize_route(
    locations: list[LocationCandidate],
    start_date: date,
    end_date: date,
    daily_start_time: time = time(8, 0),    # Bắt đầu ngày lúc 8h
    visit_duration_min: int = 90,            # Thời gian tham quan mỗi điểm (phút)
) -> OptimizedRoute:
    """
    Tối ưu thứ tự các stops bằng DP Bitmask TSP.

    Thuật toán:
    1. Dùng DP Bitmask TSP tìm đường đi ngắn nhất (chính xác tuyệt đối)
    2. Fallback Nearest-Neighbor nếu > 18 điểm (tránh O(N^2 * 2^N) quá lớn)
    3. Tính distance/time bằng Google Maps (fallback Haversine)
    4. Phân bổ stops theo ngày dựa trên thời gian

    Parameters
    ----------
    locations : danh sách locations đã chọn
    start_date, end_date : khoảng ngày
    daily_start_time : giờ bắt đầu mỗi ngày
    visit_duration_min : thời gian tham quan trung bình mỗi điểm (phút)
    """
    if not locations:
        return OptimizedRoute(stops=[], routes=[], total_distance_km=0, total_travel_time_min=0)

    num_days = (end_date - start_date).days + 1
    if num_days <= 0:
        num_days = 1

    # --- TSP ordering ---
    ordered = _dp_bitmask_tsp(locations)

    # --- Compute route segments ---
    segments: list[RouteSegmentResult] = []
    for i in range(len(ordered) - 1):
        loc_a = ordered[i]
        loc_b = ordered[i + 1]
        route_result = get_route_polyline(
            loc_a.latitude, loc_a.longitude,
            loc_b.latitude, loc_b.longitude,
        )
        segments.append(RouteSegmentResult(
            from_order=i + 1,
            to_order=i + 2,
            distance_km=route_result.distance_km,
            travel_time_min=route_result.travel_time_min,
            polyline_data=route_result.polyline_data,
        ))

    # --- Assign stops to days ---
    stops = _assign_stops_to_days(
        ordered, segments, num_days, start_date, daily_start_time, visit_duration_min
    )

    total_dist = sum(s.distance_km for s in segments)
    total_time = sum(s.travel_time_min for s in segments)

    return OptimizedRoute(
        stops=stops,
        routes=segments,
        total_distance_km=round(total_dist, 2),
        total_travel_time_min=total_time,
    )


def _nearest_neighbor_tsp(locations: list[LocationCandidate]) -> list[LocationCandidate]:
    """
    Sắp xếp danh sách locations theo Nearest-Neighbor TSP.

    Bắt đầu từ location[0], mỗi bước chọn location gần nhất chưa thăm.
    Sử dụng Google Maps distance (fallback Haversine).
    """
    if len(locations) <= 1:
        return list(locations)

    remaining = list(locations)
    ordered = [remaining.pop(0)]

    while remaining:
        current = ordered[-1]
        best_idx = 0
        best_dist = float("inf")

        for i, candidate in enumerate(remaining):
            result = get_distance_and_duration(
                current.latitude, current.longitude,
                candidate.latitude, candidate.longitude,
            )
            if result.distance_km < best_dist:
                best_dist = result.distance_km
                best_idx = i

        ordered.append(remaining.pop(best_idx))

    return ordered


def _dp_bitmask_tsp(locations: list[LocationCandidate]) -> list[LocationCandidate]:
    """
    Sắp xếp danh sách locations theo Dynamic Programming Bitmask TSP.
    Đảm bảo tìm ra đường đi ngắn nhất (chính xác tuyệt đối) qua tất cả các điểm.
    Bắt đầu cố định từ location[0].
    """
    n = len(locations)
    if n <= 1:
        return list(locations)

    # Nếu số lượng điểm quá lớn (ví dụ > 18), DP bitmask sẽ rất chậm và tốn RAM O(N^2 * 2^N).
    # Tuy nhiên lộ trình du lịch hiếm khi > 15 điểm/phiên. Fallback về greedy nếu n > 18.
    if n > 18:
        return _nearest_neighbor_tsp(locations)

    # 1. Tính ma trận khoảng cách
    dist = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                result = get_distance_and_duration(
                    locations[i].latitude, locations[i].longitude,
                    locations[j].latitude, locations[j].longitude,
                )
                dist[i][j] = result.distance_km

    # 2. Quy hoạch động (DP)
    # dp[mask][u] = khoảng cách nhỏ nhất để đến u với tập mask đã đi qua
    dp = [[float("inf")] * n for _ in range(1 << n)]
    parent = [[-1] * n for _ in range(1 << n)]

    # Bắt đầu từ nút 0
    dp[1][0] = 0.0

    for mask in range(1 << n):
        for u in range(n):
            if not (mask & (1 << u)):
                continue
            for v in range(n):
                if mask & (1 << v):
                    continue
                new_mask = mask | (1 << v)
                new_dist = dp[mask][u] + dist[u][v]
                if new_dist < dp[new_mask][v]:
                    dp[new_mask][v] = new_dist
                    parent[new_mask][v] = u

    # 3. Tìm điểm kết thúc để có tổng quãng đường nhỏ nhất
    final_mask = (1 << n) - 1
    min_dist = float("inf")
    last = -1
    for i in range(n):
        if dp[final_mask][i] < min_dist:
            min_dist = dp[final_mask][i]
            last = i

    # 4. Truy ngược đường đi
    path = []
    mask = final_mask
    while last != -1:
        path.append(last)
        prev = parent[mask][last]
        mask ^= (1 << last)
        last = prev

    path.reverse()

    return [locations[i] for i in path]


def _assign_stops_to_days(
    ordered_locs: list[LocationCandidate],
    segments: list[RouteSegmentResult],
    num_days: int,
    start_date: date,
    daily_start: time,
    visit_min: int,
) -> list[OptimizedStop]:
    """
    Phân bổ stops vào các ngày dựa trên thời gian.

    Logic: mỗi ngày có ~10 giờ hoạt động (8:00–18:00).
    Tổng thời gian mỗi ngày = travel_time + visit_time.
    Khi hết quỹ thời gian → chuyển sang ngày tiếp theo.
    """
    MAX_DAILY_MINUTES = 600  # 10 tiếng

    stops: list[OptimizedStop] = []
    current_day = 1
    daily_minutes_used = 0
    current_time_minutes = daily_start.hour * 60 + daily_start.minute

    for i, loc in enumerate(ordered_locs):
        # Travel time đến stop này (từ stop trước)
        travel_time = 0
        if i > 0 and i - 1 < len(segments):
            travel_time = segments[i - 1].travel_time_min

        needed_minutes = travel_time + visit_min

        # Kiểm tra xem có đủ thời gian trong ngày không
        if daily_minutes_used + needed_minutes > MAX_DAILY_MINUTES and i > 0:
            # Chuyển sang ngày mới
            current_day += 1
            if current_day > num_days:
                current_day = num_days  # Dồn vào ngày cuối nếu hết ngày
            daily_minutes_used = 0
            current_time_minutes = daily_start.hour * 60 + daily_start.minute

        # Tính arrival / departure time
        arrival_minutes = current_time_minutes + travel_time
        departure_minutes = arrival_minutes + visit_min

        arrival_t = time(
            min(23, arrival_minutes // 60),
            arrival_minutes % 60,
        )
        departure_t = time(
            min(23, departure_minutes // 60),
            departure_minutes % 60,
        )

        stops.append(OptimizedStop(
            location_id=loc.location_id,
            location_name=loc.location_name,
            latitude=loc.latitude,
            longitude=loc.longitude,
            order=i + 1,
            day=current_day,
            arrival_time=arrival_t,
            departure_time=departure_t,
            min_price=loc.min_price,
            max_price=loc.max_price,
        ))

        daily_minutes_used += needed_minutes
        current_time_minutes = departure_minutes

    return stops