from sqlmodel import Session, select
import models

def seed_default_gamification_shop(db: Session):
    """Seed default Milestones, DiscoveryPrompts, and Privileges into database if not present."""
    
    # 1. Milestones
    default_milestones = [
        models.Milestones(
            milestone_id=1,
            milestone_name="Chân đi không mỏi",
            vibe_tag="Phượt thủ",
            description="Huy chương đồng hành cùng bạn trên 10km đường dài.",
            icon_url="🏃",
            requirement="Đi bộ tổng cộng 10km",
            credit_reward=100
        ),
        models.Milestones(
            milestone_id=2,
            milestone_name="Thực thần phương Nam",
            vibe_tag="Ẩm thực",
            description="Huy chương cho người sành ăn, đã khám phá 5 địa điểm ẩm thực đặc sắc.",
            icon_url="🍔",
            requirement="Check-in 5 địa điểm ẩm thực hoặc cafe",
            credit_reward=200
        ),
        models.Milestones(
            milestone_id=3,
            milestone_name="Người truyền lửa",
            vibe_tag="Cộng đồng",
            description="Đăng 3 bài viết chia sẻ kinh nghiệm trên mạng xã hội du lịch.",
            icon_url="🔥",
            requirement="Đăng 3 bài đăng trên mạng xã hội",
            credit_reward=150
        )
    ]
    
    for ms in default_milestones:
        existing = db.exec(select(models.Milestones).where(models.Milestones.milestone_id == ms.milestone_id)).first()
        if not existing:
            # Let's insert with the specific ID
            db.add(ms)
            
    # 2. DiscoveryPrompts
    default_prompts = [
        models.DiscoveryPrompts(
            prompt_id=1,
            title="Khám phá Phố cổ Hội An",
            description="Ghé thăm Chùa Cầu và check-in chụp hình lưu niệm.",
            difficulty="Dễ",
            footprint_reward=300,
            target_count=1
        ),
        models.DiscoveryPrompts(
            prompt_id=2,
            title="Check-in 3 quán Cafe phố cổ",
            description="Tìm kiếm và check-in tại 3 quán cà phê mang phong cách retro.",
            difficulty="Trung bình",
            footprint_reward=500,
            target_count=3
        ),
        models.DiscoveryPrompts(
            prompt_id=3,
            title="Đại sứ ẩm thực Hà Nội",
            description="Check-in tại 3 quán phở lâu đời ở khu vực Hà Nội.",
            difficulty="Khó",
            footprint_reward=800,
            target_count=3
        )
    ]
    
    for dp in default_prompts:
        existing = db.exec(select(models.DiscoveryPrompts).where(models.DiscoveryPrompts.prompt_id == dp.prompt_id)).first()
        if not existing:
            db.add(dp)
            
    # 3. Privileges
    default_privileges = [
        models.Privileges(
            privilege_id=1,
            brand_name="Starbucks Coffee",
            title="Voucher 50,000đ",
            description="Áp dụng cho toàn bộ đồ uống tại các cửa hàng Starbucks Việt Nam.",
            credit_cost=500,
            image_url="https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
            is_active=True
        ),
        models.Privileges(
            privilege_id=2,
            brand_name="Highlands Coffee",
            title="Voucher 30,000đ",
            description="Áp dụng cho hoá đơn từ 99,000đ tại Highlands Coffee.",
            credit_cost=300,
            image_url="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
            is_active=True
        ),
        models.Privileges(
            privilege_id=3,
            brand_name="GrabCar",
            title="Mã GrabCar Giảm 20k",
            description="Giảm trực tiếp 20,000đ cho chuyến đi GrabCar tiếp theo của bạn.",
            credit_cost=200,
            image_url="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
            is_active=True
        ),
        models.Privileges(
            privilege_id=4,
            brand_name="Gong Cha",
            title="Voucher Giảm 10%",
            description="Giảm 10% tối đa 30,000đ trên tổng hóa đơn trà sữa Gong Cha.",
            credit_cost=150,
            image_url="https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400",
            is_active=True
        )
    ]
    
    for pr in default_privileges:
        existing = db.exec(select(models.Privileges).where(models.Privileges.privilege_id == pr.privilege_id)).first()
        if not existing:
            db.add(pr)
            
    db.commit()
    print("[OK] Seeded new gamification & shop default data!")
