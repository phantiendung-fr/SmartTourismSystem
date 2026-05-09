#SCRIPT PYTHON TẠO DỮ LIỆU MẪU CÁC LOCATION VÀ TAG

import json
import random
import re
from datetime import time
from supabase import create_client, Client

# --- THIẾT LẬP KẾT NỐI ---
url: str = "https://huyalfizralenyrzkpbv.supabase.co"
key: str = "sb_secret_API_KEY" # Điền secret API Key của database để chạy script, không public vì lí do bảo mật
supabase: Client = create_client(url, key)

# Tọa độ trung tâm (Mock) của các thành phố trong file JSON
CITY_COORDINATES = {
    "Hà Nội": (21.0285, 105.8542),
    "Thành phố Hồ Chí Minh": (10.8231, 106.6297),
    "Thừa Thiên Huế": (16.4637, 107.5909),
    "Hội An": (15.8801, 108.3380),
    "Đà Lạt": (11.9404, 108.4583),
    "Đà Nẵng": (16.0471, 108.2062),
    "Nha Trang": (12.2388, 109.1967),
    "Hạ Long": (20.9599, 107.0448),
    "Ninh Bình": (20.2539, 105.9750),
    "Phú Quốc": (10.2289, 103.9572)
}

def parse_price(price_str):
    """Trích xuất con số từ chuỗi giá (VD: '20.000 - 50.000' -> 20000, 50000)"""
    numbers = re.findall(r'\d+\.?\d*', price_str.replace('.', ''))
    if not numbers:
        return 0, 0
    if len(numbers) == 1:
        return float(numbers[0]), float(numbers[0])
    return float(numbers[0]), float(numbers[1])

def seed_data_from_json():
    print("Đang đọc file JSON...")
    with open('Vietnam_tourism_2026.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    
    dataset = data.get("Vietnam_Tourism_Dataset_2026", {})

    # 1. ĐỒNG BỘ DANH MỤC (CATEGORIES)
    category_map = {}
    categories = ["Điểm tham quan", "Nơi lưu trú", "Quán ăn"]
    for cat in categories:
        res = supabase.table('categories').select('*').eq('category_name', cat).execute()
        if not res.data:
            inserted = supabase.table('categories').insert({"category_name": cat}).execute()
            category_map[cat] = inserted.data[0]['category_id']
        else:
            category_map[cat] = res.data[0]['category_id']

    # 2. ĐỒNG BỘ THÀNH PHỐ VÀ ĐỊA ĐIỂM
    for city_name, city_data in dataset.items():
        print(f"\n--- Đang xử lý thành phố: {city_name} ---")
        
        # Insert Thành phố
        res_city = supabase.table('cities').select('*').eq('city_name', city_name).execute()
        base_lat, base_lng = CITY_COORDINATES.get(city_name, (14.0583, 108.2772)) # Default VN coord
        
        if not res_city.data:
            inserted_city = supabase.table('cities').insert({
                "city_name": city_name,
                "region": "Vietnam",
                "latitude": base_lat,
                "longitude": base_lng
            }).execute()
            city_id = inserted_city.data[0]['city_id']
        else:
            city_id = res_city.data[0]['city_id']

        # Hàm tiện ích để insert Locations
        def insert_locations(items, category_key, category_name):
            cat_id = category_map[category_name]
            for item in items:
                loc_name = item.get('ten') or item.get('ten_quan') or item.get('token')
                if not loc_name: continue

                # Parse giá
                price_str = item.get('gia_ve_tham_khao') or item.get('gia_trung_binh') or "0"
                min_p, max_p = parse_price(price_str)

                # Mock tọa độ (cộng trừ ngẫu nhiên trong bán kính ~5km)
                lat = base_lat + random.uniform(-0.05, 0.05)
                lng = base_lng + random.uniform(-0.05, 0.05)

                try:
                    # Insert vào bảng LOCATIONS
                    loc_res = supabase.table('locations').insert({
                        "location_name": loc_name,
                        "latitude": round(lat, 6),
                        "longitude": round(lng, 6),
                        "city_id": city_id,
                        "open_time": "07:00:00", # Mock giờ mở cửa
                        "close_time": "22:00:00", # Mock giờ đóng cửa
                        "min_price": min_p,
                        "max_price": max_p,
                        "currency": "VND"
                    }).execute()
                    
                    loc_id = loc_res.data[0]['location_id']
                    
                    # Liên kết địa điểm với Danh mục trong bảng LOCATION_CATEGORIES
                    supabase.table('location_categories').insert({
                        "location_id": loc_id,
                        "category_id": cat_id
                    }).execute()
                    
                    print(f"  + Đã thêm: {loc_name}")
                except Exception as e:
                    print(f"  - Bỏ qua {loc_name} (Có thể do trùng tọa độ): {e}")

        # Chạy insert cho từng nhóm trong JSON
        if "diem_du_lich" in city_data:
            insert_locations(city_data["diem_du_lich"], "diem_du_lich", "Điểm tham quan")
        
        if "khach_san" in city_data:
            insert_locations(city_data["khach_san"], "khach_san", "Nơi lưu trú")
            
        if "nha_hang" in city_data:
            insert_locations(city_data["nha_hang"], "nha_hang", "Quán ăn")

    # 3. ĐỒNG BỘ TAGS (Nếu cần thiết)
    print("\n--- Hoàn tất Seeding dữ liệu ---")

if __name__ == "__main__":
    seed_data_from_json()