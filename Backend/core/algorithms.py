import math
from typing import List, Tuple, Optional

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Tính khoảng cách đường chim bay giữa 2 điểm (km) bằng công thức Haversine.
    """
    R = 6371.0  # Bán kính Trái Đất (km)
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def estimate_travel_time(lat1: float, lon1: float, lat2: float, lon2: float, speed_kmh: float = 40.0) -> int:
    """
    Ước lượng thời gian di chuyển (phút).
    """
    distance = haversine(lat1, lon1, lat2, lon2)
    # distance (km) / speed (km/h) = hours -> * 60 = minutes
    return int((distance / speed_kmh) * 60)

def check_within_radius(user_lat: float, user_lon: float, target_lat: float, target_lon: float, radius_m: int) -> Tuple[bool, float]:
    """
    Kiểm tra xem tọa độ user có nằm trong bán kính của điểm đích hay không.
    Trả về (is_within, khoảng_cách_thực_tế_theo_mét).
    """
    distance_km = haversine(user_lat, user_lon, target_lat, target_lon)
    distance_m = distance_km * 1000
    return distance_m <= radius_m, distance_m

def compute_tag_similarity(user_tags: List[str], location_tags: List[str]) -> float:
    """
    Tính độ tương đồng Jaccard giữa tags sở thích của User và tags của Location.
    J(A, B) = |A ∩ B| / |A ∪ B|
    """
    set_user = set(tag.lower().strip() for tag in user_tags)
    set_loc = set(tag.lower().strip() for tag in location_tags)
    
    if not set_user or not set_loc:
        return 0.0
        
    intersection = set_user.intersection(set_loc)
    union = set_user.union(set_loc)
    
    return len(intersection) / len(union)

def score_location(
    location_min_price: float,
    location_max_price: float,
    location_tags: List[str],
    user_budget: float,
    user_preferred_tags: List[str]
) -> Optional[float]:
    """
    Tính điểm cho một địa điểm để gợi ý.
    - Ràng buộc cứng: giá tối thiểu của địa điểm không được vượt quá ngân sách.
    - Ràng buộc mềm: Độ khớp tag Jaccard.
    """
    # 1. Ràng buộc cứng (Hard constraint)
    # Nếu giá rẻ nhất để chơi ở đây còn đắt hơn ngân sách của user -> Bỏ qua
    if location_min_price > user_budget:
        return None
        
    # 2. Tính Jaccard similarity
    tag_score = compute_tag_similarity(user_preferred_tags, location_tags)
    
    # 3. Tổng hợp điểm (Trong thực tế có thể thêm trọng số cho rating, khoảng cách...)
    # Ở đây dùng tag_score làm chủ đạo. Nếu giá location_max_price nằm trong budget thì cộng điểm thưởng
    bonus = 0.2 if location_max_price <= user_budget else 0.0
    
    final_score = tag_score + bonus
    return final_score