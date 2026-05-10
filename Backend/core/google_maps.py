# ============================================================
# core/google_maps.py  –  Google Maps API wrapper + Haversine fallback
# ============================================================

from __future__ import annotations
import math
from dataclasses import dataclass
from typing import Optional, List, Tuple
import httpx
from core.config import settings

# --- Data structures ---
@dataclass
class DistanceResult:
    distance_km: float        
    travel_time_min: int      
    source: str               

@dataclass
class RouteResult:
    polyline_data: str        
    distance_km: float
    travel_time_min: int
    source: str

# --- Constants ---
_EARTH_RADIUS_KM = 6371.0
_GOOGLE_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
_GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"

# --- Haversine helpers (FALLBACK) ---
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r
    a = (math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return _EARTH_RADIUS_KM * c

def estimate_travel_time_fallback(distance_km: float) -> int:
    if distance_km <= 0:
        return 0
    # Lấy tốc độ trung bình từ config, nếu không có mặc định 40km/h
    speed = getattr(settings, "AVG_CITY_SPEED_KMH", 40.0)
    hours = distance_km / speed
    return max(1, round(hours * 60))

# --- Google Maps API calls (PRIMARY) ---
def _has_valid_api_key() -> bool:
    return hasattr(settings, "GOOGLE_MAPS_API_KEY") and bool(settings.GOOGLE_MAPS_API_KEY) and settings.GOOGLE_MAPS_API_KEY != "dummy_key"

def get_full_distance_matrix(coords: List[Tuple[float, float]]) -> List[List[float]]:
    """
    Tạo ma trận khoảng cách NxN. GỌI API 1 LẦN DUY NHẤT để tiết kiệm chi phí.
    """
    n = len(coords)
    dist_matrix = [[0.0] * n for _ in range(n)]

    if _has_valid_api_key():
        try:
            # Gộp tọa độ thành chuỗi: lat1,lon1|lat2,lon2|...
            piped_coords = "|".join([f"{lat},{lon}" for lat, lon in coords])
            params = {
                "origins": piped_coords,
                "destinations": piped_coords,
                "mode": "driving",
                "key": settings.GOOGLE_MAPS_API_KEY,
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(_GOOGLE_DISTANCE_MATRIX_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

            if data.get("status") == "OK":
                for i in range(n):
                    for j in range(n):
                        if i != j:
                            element = data["rows"][i]["elements"][j]
                            if element.get("status") == "OK":
                                dist_matrix[i][j] = element["distance"]["value"] / 1000.0
                            else:
                                dist_matrix[i][j] = haversine_distance(*coords[i], *coords[j])
                return dist_matrix
        except Exception as e:
            print(f"Google Maps API Error: {e}. Falling back to Haversine.")

    # FALLBACK: Nếu rớt mạng, API hết hạn, hoặc không có Key
    for i in range(n):
        for j in range(n):
            if i != j:
                dist_matrix[i][j] = haversine_distance(*coords[i], *coords[j])
    return dist_matrix

def get_route_polyline(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> RouteResult:
    """
    Lấy đường đi chi tiết (Polyline), khoảng cách và thời gian giữa 2 trạm.
    PRIMARY: Google Maps Directions API.
    FALLBACK: Haversine & Đường thẳng ảo.
    """
    if _has_valid_api_key():
        try:
            params = {
                "origin": f"{origin_lat},{origin_lon}",
                "destination": f"{dest_lat},{dest_lon}",
                "mode": "driving",
                "key": settings.GOOGLE_MAPS_API_KEY,
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(_GOOGLE_DIRECTIONS_URL, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "OK":
                        route = data["routes"][0]
                        leg = route["legs"][0]
                        return RouteResult(
                            polyline_data=route["overview_polyline"]["points"],
                            distance_km=round(leg["distance"]["value"] / 1000.0, 2),
                            travel_time_min=max(1, round(leg["duration"]["value"] / 60)),
                            source="google_maps"
                        )
        except Exception as e:
            print(f"Directions API Error: {e}")

    # FALLBACK (Rớt mạng/Hết Key)
    dist_km = haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
    fake_polyline = f"{origin_lat},{origin_lon};{dest_lat},{dest_lon}"
    return RouteResult(
        polyline_data=fake_polyline,
        distance_km=round(dist_km, 2),
        travel_time_min=estimate_travel_time_fallback(dist_km),
        source="haversine_fallback"
    )