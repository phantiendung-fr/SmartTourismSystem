from fastapi import APIRouter, Depends, Query, Request
from sqlmodel import Session, select, func
from typing import Optional, List
from uuid import UUID
from jose import jwt

from database import get_session
from models import Users, UserProfiles
from core.config import settings

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard - Bảng xếp hạng"])

def get_optional_user_id(request: Request) -> Optional[UUID]:
    """Trích xuất user_id từ token Authorization một cách an toàn và tùy chọn."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str:
            return UUID(user_id_str)
    except Exception:
        pass
    return None

def get_tier_info(points: int) -> dict:
    """Xác định cấp độ và phân hạng dựa trên điểm tích lũy."""
    level = 1 + (points // 100)
    if level <= 5:
        return {"tier": "Bronze", "tier_vi": "Đồng", "level": level, "color": "#cd7f32"}
    elif level <= 15:
        return {"tier": "Silver", "tier_vi": "Bạc", "level": level, "color": "#c0c0c0"}
    elif level <= 30:
        return {"tier": "Gold", "tier_vi": "Vàng", "level": level, "color": "#ffd700"}
    elif level <= 50:
        return {"tier": "Platinum", "tier_vi": "Bạch Kim", "level": level, "color": "#e5e4e2"}
    else:
        return {"tier": "Diamond", "tier_vi": "Kim Cương", "level": level, "color": "#b9f2ff"}

@router.get("")
def get_leaderboard(
    request: Request,
    category: str = Query("global", description="Hạng mục: global, region, tier"),
    region_name: Optional[str] = Query(None, description="Tên khu vực (ví dụ: Hà Nội, TP. Hồ Chí Minh)"),
    tier_name: Optional[str] = Query(None, description="Tên phân hạng (Bronze, Silver, Gold, Platinum, Diamond)"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_session)
):
    current_user_id = get_optional_user_id(request)

    # 1. Xây dựng câu truy vấn cơ bản lấy danh sách người dùng active
    query = (
        select(Users.full_name, UserProfiles.avatar_url, UserProfiles.base_location, UserProfiles.total_points, UserProfiles.user_id)
        .join(UserProfiles, Users.user_id == UserProfiles.user_id)
        .where(Users.status == "ACTIVE")
    )

    # 2. Áp dụng các bộ lọc dựa trên category
    if category == "region":
        # Nếu chọn lọc theo khu vực
        if region_name:
            query = query.where(UserProfiles.base_location == region_name)
        else:
            # Nếu không chỉ định khu vực, cố gắng lấy khu vực của chính user đó
            if current_user_id:
                user_prof = db.exec(select(UserProfiles).where(UserProfiles.user_id == current_user_id)).first()
                if user_prof and user_prof.base_location:
                    region_name = user_prof.base_location
                    query = query.where(UserProfiles.base_location == region_name)
                else:
                    # Mặc định Hà Nội nếu user cũng không có khu vực
                    region_name = "Hà Nội"
                    query = query.where(UserProfiles.base_location == region_name)
            else:
                region_name = "Hà Nội"
                query = query.where(UserProfiles.base_location == region_name)
                
    elif category == "tier" and tier_name:
        # Lọc theo phân hạng (Quy đổi điểm tương ứng)
        if tier_name == "Bronze":
            query = query.where(UserProfiles.total_points < 500)
        elif tier_name == "Silver":
            query = query.where(UserProfiles.total_points >= 500, UserProfiles.total_points < 1500)
        elif tier_name == "Gold":
            query = query.where(UserProfiles.total_points >= 1500, UserProfiles.total_points < 3000)
        elif tier_name == "Platinum":
            query = query.where(UserProfiles.total_points >= 3000, UserProfiles.total_points < 5000)
        elif tier_name == "Diamond":
            query = query.where(UserProfiles.total_points >= 5000)

    # Sắp xếp theo điểm giảm dần
    query = query.order_by(UserProfiles.total_points.desc())
    
    # Thực hiện truy vấn lấy danh sách leaderboard giới hạn
    results = db.exec(query.limit(limit)).all()

    # Định dạng danh sách kết quả trả về
    leaderboard_list = []
    for idx, row in enumerate(results):
        full_name, avatar_url, base_location, total_points, user_id = row
        tier_data = get_tier_info(total_points)
        leaderboard_list.append({
            "rank": idx + 1,
            "user_id": str(user_id),
            "full_name": full_name,
            "avatar_url": avatar_url,
            "base_location": base_location or "Chưa cập nhật",
            "total_points": total_points,
            "level": tier_data["level"],
            "tier": tier_data["tier"],
            "tier_vi": tier_data["tier_vi"],
            "tier_color": tier_data["color"]
        })

    # 3. Tính toán thông tin cá nhân của user đang đăng nhập
    my_rank_data = None
    if current_user_id:
        user_prof = db.exec(select(UserProfiles).where(UserProfiles.user_id == current_user_id)).first()
        user_record = db.exec(select(Users).where(Users.user_id == current_user_id)).first()
        if user_prof and user_record:
            # Câu truy vấn đếm số người có điểm cao hơn để xác định thứ hạng
            rank_query = select(func.count(UserProfiles.user_id)).join(Users, Users.user_id == UserProfiles.user_id).where(Users.status == "ACTIVE")
            
            # Áp dụng các bộ lọc giống hệt như danh sách trên
            if category == "region" and region_name:
                rank_query = rank_query.where(UserProfiles.base_location == region_name)
            elif category == "tier" and tier_name:
                if tier_name == "Bronze":
                    rank_query = rank_query.where(UserProfiles.total_points < 500)
                elif tier_name == "Silver":
                    rank_query = rank_query.where(UserProfiles.total_points >= 500, UserProfiles.total_points < 1500)
                elif tier_name == "Gold":
                    rank_query = rank_query.where(UserProfiles.total_points >= 1500, UserProfiles.total_points < 3000)
                elif tier_name == "Platinum":
                    rank_query = rank_query.where(UserProfiles.total_points >= 3000, UserProfiles.total_points < 5000)
                elif tier_name == "Diamond":
                    rank_query = rank_query.where(UserProfiles.total_points >= 5000)
            
            # Chỉ đếm những người có điểm lớn hơn user hiện tại
            rank_query = rank_query.where(UserProfiles.total_points > user_prof.total_points)
            my_rank = db.exec(rank_query).one() + 1
            
            my_tier_data = get_tier_info(user_prof.total_points)
            my_rank_data = {
                "rank": my_rank,
                "user_id": str(current_user_id),
                "full_name": user_record.full_name,
                "avatar_url": user_prof.avatar_url,
                "base_location": user_prof.base_location or "Chưa cập nhật",
                "total_points": user_prof.total_points,
                "level": my_tier_data["level"],
                "tier": my_tier_data["tier"],
                "tier_vi": my_tier_data["tier_vi"],
                "tier_color": my_tier_data["color"]
            }

    # 4. Lấy danh sách các khu vực (base_location) độc nhất để làm bộ lọc cho Frontend
    regions_query = select(UserProfiles.base_location).where(UserProfiles.base_location != None).distinct()
    available_regions = [r for r in db.exec(regions_query).all() if r]

    return {
        "status": "success",
        "category": category,
        "region_name": region_name,
        "tier_name": tier_name,
        "available_regions": available_regions or ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng"],
        "leaderboard": leaderboard_list,
        "my_rank": my_rank_data
    }
