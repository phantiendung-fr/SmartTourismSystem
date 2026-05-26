from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
import requests
import os

router = APIRouter(prefix="/api/discovery", tags=["Discovery - Proxy Bản đồ & Thời tiết"])

@router.get("/geocode/reverse")
def reverse_geocode(lat: float, lon: float):
    """Proxy cho Nominatim Reverse Geocoding tránh lỗi CORS/Network trên Mobile/Browser"""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&accept-language=vi&zoom=14"
        headers = {
            "User-Agent": "SmartTourismApp/1.0 (Contact: admin@smarttourism.vn)"
        }
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e), "address": {}}

@router.get("/geocode/search")
def search_geocode(q: str, lat: float = None, lon: float = None, db: Session = Depends(get_session)):
    """Proxy cho Nominatim Search kết hợp tìm kiếm điểm du lịch hệ thống"""
    from models import Cities, Locations
    from sqlmodel import select
    
    db_results = []
    
    # 1. Tìm kiếm trong cơ sở dữ liệu local
    try:
        # A. Tìm kiếm Thành phố
        cities_stmt = select(Cities).where(Cities.city_name.ilike(f"%{q}%")).limit(3)
        db_cities = db.exec(cities_stmt).all()
        for city in db_cities:
            db_results.append({
                "place_id": f"db_city_{city.city_id}",
                "licence": "Local Database",
                "lat": str(city.latitude),
                "lon": str(city.longitude),
                "display_name": f"{city.city_name}, Việt Nam (Thành phố đề xuất)",
                "class": "place",
                "type": "city",
                "importance": 1.0,
                "address": {
                    "city": city.city_name,
                    "country": "Việt Nam",
                    "country_code": "vn"
                }
            })
            
        # B. Tìm kiếm Địa điểm
        locs_stmt = select(Locations).where(Locations.location_name.ilike(f"%{q}%")).limit(5)
        db_locs = db.exec(locs_stmt).all()
        for loc in db_locs:
            db_results.append({
                "place_id": f"db_{loc.location_id}",
                "licence": "Local Database",
                "lat": str(loc.latitude),
                "lon": str(loc.longitude),
                "display_name": f"{loc.location_name}, Việt Nam (Điểm đến đề xuất)",
                "class": "place",
                "type": "poi",
                "importance": 1.0,
                "address": {
                    "amenity": loc.location_name,
                    "country": "Việt Nam",
                    "country_code": "vn"
                }
            })
    except Exception as db_err:
        print(f"[!] Local search error: {db_err}")

    # 2. Tìm kiếm Nominatim
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": q,
            "format": "json",
            "addressdetails": 1,
            "limit": 10,
            "countrycodes": "vn",
            "email": "dev@smarttourism.vn"
        }
        
        if lat is not None and lon is not None:
            params["lat"] = lat
            params["lon"] = lon
            left = lon - 0.5
            right = lon + 0.5
            top = lat + 0.5
            bottom = lat - 0.5
            params["viewbox"] = f"{left},{top},{right},{bottom}"
            params["bounded"] = 0

        headers = {
            "User-Agent": "SmartTourismAppV2/2.0 (Contact: dev@smarttourism.vn)"
        }
        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        osm_results = response.json()
        
        combined = db_results + osm_results
        
        seen = set()
        unique_combined = []
        for item in combined:
            name = item.get("display_name", "").split(',')[0].lower().strip()
            if name not in seen:
                seen.add(name)
                unique_combined.append(item)
                
        return unique_combined[:8]
    except Exception as e:
        print(f"[!] Nominatim proxy error: {e}")
        return db_results

@router.get("/weather")
def get_weather_info(lat: float, lon: float):
    """Lấy thông tin thời tiết từ tọa độ GPS"""
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        curr = data.get("current_weather", {})
        return {
            "temp": curr.get("temperature", 25.0),
            "windspeed": curr.get("windspeed", 0.0),
            "condition": "Thoáng đãng",
            "weathercode": curr.get("weathercode", 0)
        }
    except Exception as e:
        return {"temp": 25.0, "condition": "Không rõ", "error": str(e)}
