# ============================================================
# core/google_maps.py  –  Google Maps API wrapper + Haversine fallback
#
# PRIMARY:  Google Maps Distance Matrix / Directions API
# FALLBACK: Haversine (đường chim bay) khi API không available
# ============================================================

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

import httpx

from core.config import settings


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class DistanceResult:
    """Kết quả tính khoảng cách giữa 2 điểm."""
    distance_km: float        # km
    travel_time_min: int      # phút
    source: str               # "google_maps" | "haversine_fallback"


@dataclass
class RouteResult:
    """Kết quả lấy polyline đường đi giữa 2 điểm."""
    polyline_data: str        # Encoded polyline hoặc raw coords
    distance_km: float
    travel_time_min: int
    source: str


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_EARTH_RADIUS_KM = 6371.0
_GOOGLE_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
_GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"


# ---------------------------------------------------------------------------
# Haversine helpers (FALLBACK)
# ---------------------------------------------------------------------------

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Tính khoảng cách đường chim bay giữa 2 tọa độ (km).

    Sử dụng công thức Haversine:
        a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlon/2)
        c = 2 · atan2(√a, √(1−a))
        d = R · c
    """
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = (math.sin(dlat / 2) ** 2
         + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return _EARTH_RADIUS_KM * c


def estimate_travel_time_fallback(distance_km: float) -> int:
    """
    Ước lượng thời gian di chuyển (phút) từ khoảng cách.

    Giả định tốc độ trung bình trong thành phố = settings.AVG_CITY_SPEED_KMH.
    """
    if distance_km <= 0:
        return 0
    hours = distance_km / settings.AVG_CITY_SPEED_KMH
    return max(1, round(hours * 60))


def is_within_radius(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
    radius_meters: float,
) -> tuple[bool, float]:
    """
    Kiểm tra 2 điểm có nằm trong bán kính cho trước không.

    Returns
    -------
    (is_within, distance_meters)
    """
    dist_km = haversine_distance(lat1, lon1, lat2, lon2)
    dist_m = dist_km * 1000
    return dist_m <= radius_meters, dist_m


# ---------------------------------------------------------------------------
# Google Maps API calls (PRIMARY)
# ---------------------------------------------------------------------------

def _has_valid_api_key() -> bool:
    """Kiểm tra API key có được cấu hình không."""
    return bool(settings.GOOGLE_MAPS_API_KEY)


def get_distance_and_duration(
    origin_lat: float, origin_lon: float,
    dest_lat: float, dest_lon: float,
) -> DistanceResult:
    """
    Tính khoảng cách & thời gian di chuyển giữa 2 điểm.

    PRIMARY:  Google Maps Distance Matrix API
    FALLBACK: Haversine
    """
    if _has_valid_api_key():
        try:
            return _google_distance_matrix(origin_lat, origin_lon, dest_lat, dest_lon)
        except Exception:
            # Fallback nếu API call thất bại
            pass

    # FALLBACK – đường chim bay
    dist_km = haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
    travel_min = estimate_travel_time_fallback(dist_km)
    return DistanceResult(
        distance_km=round(dist_km, 2),
        travel_time_min=travel_min,
        source="haversine_fallback",
    )


def get_route_polyline(
    origin_lat: float, origin_lon: float,
    dest_lat: float, dest_lon: float,
) -> RouteResult:
    """
    Lấy polyline đường đi giữa 2 điểm.

    PRIMARY:  Google Maps Directions API
    FALLBACK: Đường thẳng (polyline giả từ 2 tọa độ)
    """
    if _has_valid_api_key():
        try:
            return _google_directions(origin_lat, origin_lon, dest_lat, dest_lon)
        except Exception:
            pass

    # FALLBACK – đường thẳng giữa 2 điểm
    dist_km = haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
    travel_min = estimate_travel_time_fallback(dist_km)
    # Polyline giả: chỉ chứa 2 tọa độ đầu-cuối
    fake_polyline = f"{origin_lat},{origin_lon};{dest_lat},{dest_lon}"
    return RouteResult(
        polyline_data=fake_polyline,
        distance_km=round(dist_km, 2),
        travel_time_min=travel_min,
        source="haversine_fallback",
    )


# ---------------------------------------------------------------------------
# Internal Google Maps API implementations
# ---------------------------------------------------------------------------

def _google_distance_matrix(
    origin_lat: float, origin_lon: float,
    dest_lat: float, dest_lon: float,
) -> DistanceResult:
    """Gọi Google Maps Distance Matrix API."""
    params = {
        "origins": f"{origin_lat},{origin_lon}",
        "destinations": f"{dest_lat},{dest_lon}",
        "mode": "driving",
        "language": "vi",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }

    with httpx.Client(timeout=10.0) as client:
        resp = client.get(_GOOGLE_DISTANCE_MATRIX_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") != "OK":
        raise RuntimeError(f"Google Distance Matrix API error: {data.get('status')}")

    element = data["rows"][0]["elements"][0]
    if element.get("status") != "OK":
        raise RuntimeError(f"Distance Matrix element error: {element.get('status')}")

    distance_m = element["distance"]["value"]       # mét
    duration_s = element["duration"]["value"]        # giây

    return DistanceResult(
        distance_km=round(distance_m / 1000, 2),
        travel_time_min=max(1, round(duration_s / 60)),
        source="google_maps",
    )


def _google_directions(
    origin_lat: float, origin_lon: float,
    dest_lat: float, dest_lon: float,
) -> RouteResult:
    """Gọi Google Maps Directions API để lấy polyline."""
    params = {
        "origin": f"{origin_lat},{origin_lon}",
        "destination": f"{dest_lat},{dest_lon}",
        "mode": "driving",
        "language": "vi",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }

    with httpx.Client(timeout=10.0) as client:
        resp = client.get(_GOOGLE_DIRECTIONS_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") != "OK":
        raise RuntimeError(f"Google Directions API error: {data.get('status')}")

    route = data["routes"][0]
    leg = route["legs"][0]

    polyline = route["overview_polyline"]["points"]
    distance_m = leg["distance"]["value"]
    duration_s = leg["duration"]["value"]

    return RouteResult(
        polyline_data=polyline,
        distance_km=round(distance_m / 1000, 2),
        travel_time_min=max(1, round(duration_s / 60)),
        source="google_maps",
    )
