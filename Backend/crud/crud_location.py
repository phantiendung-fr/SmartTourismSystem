from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from models import Location, City, LocationTag, Tag

def get_locations_by_city(db: Session, city_id: int) -> List[Location]:
    """
    Lấy danh sách các địa điểm trong một thành phố, load kèm theo Tag.
    """
    return (
        db.query(Location)
        .filter(Location.city_id == city_id)
        # Sử dụng joinedload để tránh N+1 query khi truy xuất tags
        .options(
            joinedload(Location.tags).joinedload(LocationTag.tag)
        )
        .all()
    )

def get_locations_by_ids(db: Session, location_ids: List[str]) -> List[Location]:
    """
    Lấy danh sách địa điểm dựa trên một danh sách các location_id.
    """
    if not location_ids:
        return []
    return (
        db.query(Location)
        .filter(Location.location_id.in_(location_ids))
        .all()
    )
