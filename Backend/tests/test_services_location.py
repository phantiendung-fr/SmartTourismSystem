import pytest
from uuid import uuid4
from datetime import time
from decimal import Decimal
from fastapi import HTTPException
from sqlmodel import Session

from models import Categories, EnterpriseProfiles, EnterpriseStatus, Cities, Locations, Tags
from schemas import LocationCreate, CurrencyEnum
from services.location_service import (
    _get_enterprise_by_user, _resolve_coordinates, register_location
)

@pytest.fixture(name="service_setup")
def service_setup_fixture(db_session: Session):
    user_id = uuid4()
    enterprise = EnterpriseProfiles(
        enterprise_id=uuid4(),
        user_id=user_id,
        business_name="SmartTour Corp",
        contact_person="Director",
        contact_email="contact@smarttour.com",
        contact_phone="0912345678",
        status=EnterpriseStatus.ACTIVE
    )
    db_session.add(enterprise)

    city = Cities(
        city_id=10,
        city_name="Hà Nội",
        region="Miền Bắc",
        latitude=Decimal("21.027764"),
        longitude=Decimal("105.834160")
    )
    db_session.add(city)

    category_1 = Categories(category_id=1, category_name="Di tích")
    category_2 = Categories(category_id=2, category_name="Văn hóa")
    tag_1 = Tags(tag_id=3, tag_name="Lịch sử")
    tag_2 = Tags(tag_id=4, tag_name="Chụp ảnh")
    db_session.add(category_1)
    db_session.add(category_2)
    db_session.add(tag_1)
    db_session.add(tag_2)
    db_session.commit()

    return {
        "user_id": user_id,
        "enterprise_id": enterprise.enterprise_id
    }


def make_location_data(**overrides):
    payload = {
        "location_name": "Bạch Dinh",
        "address": "1 Trần Phú, Vũng Tàu",
        "latitude": Decimal("10.334000"),
        "longitude": Decimal("107.084000"),
        "city_id": 10,
        "open_time": time(8, 0),
        "close_time": time(17, 0),
        "min_price": Decimal("10000"),
        "max_price": Decimal("20000"),
        "currency": CurrencyEnum.VND,
        "category_ids": [1, 2],
        "tag_ids": [3, 4],
        "image_urls": ["https://example.com/location.jpg"],
        "photo_task_title": "Chụp ảnh tại địa điểm",
        "photo_task_description": "Chụp ảnh check-in tại khu vực chính.",
        "reference_image_url": "https://example.com/reference.jpg",
        "photo_reward_exp": 100,
        "photo_radius_meters": 80,
        "qa_question": "Địa điểm này thuộc loại trải nghiệm nào?",
        "qa_option_a": "Văn hóa",
        "qa_option_b": "Thể thao",
        "qa_option_c": "Mua sắm",
        "qa_option_d": "Công nghệ",
        "qa_correct_answer": "A",
        "qa_difficulty": "easy",
        "qa_reward_exp": 30,
        "qa_reward_coin": 15,
        "qr_reward_exp": 50,
        "qr_reward_coin": 25,
        "qr_valid_days": 365,
    }
    payload.update(overrides)
    return LocationCreate(**payload)

def test_get_enterprise_by_user(db_session: Session, service_setup):
    user_id = service_setup["user_id"]

    # 1. Active enterprise -> returns profile
    profile = _get_enterprise_by_user(db_session, user_id)
    assert profile is not None
    assert profile.business_name == "SmartTour Corp"

    # 2. Enterprise does not exist -> 404
    with pytest.raises(HTTPException) as exc:
        _get_enterprise_by_user(db_session, uuid4())
    assert exc.value.status_code == 404

    # 3. Enterprise pending status -> 403
    profile.status = EnterpriseStatus.PENDING
    db_session.add(profile)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        _get_enterprise_by_user(db_session, user_id)
    assert exc.value.status_code == 403

def test_resolve_coordinates():
    lat, lon = _resolve_coordinates("Hồ Gươm, Hà Nội")
    assert 20.9 <= lat <= 21.1
    assert 105.7 <= lon <= 105.9

    lat2, lon2 = _resolve_coordinates("Cầu Rồng, Đà Nẵng")
    assert 15.9 <= lat2 <= 16.2
    assert 108.1 <= lon2 <= 108.3

    lat3, lon3 = _resolve_coordinates("Bến Thành, TP HCM")
    assert 10.6 <= lat3 <= 10.9
    assert 106.5 <= lon3 <= 106.9

def test_register_location_time_validation(db_session: Session, service_setup):
    user_id = service_setup["user_id"]
    
    # close_time <= open_time
    invalid_data = make_location_data(open_time=time(17, 0), close_time=time(8, 0))

    with pytest.raises(HTTPException) as exc:
        register_location(db_session, user_id, invalid_data)
    assert exc.value.status_code == 400
    assert "close_time phải lớn hơn open_time" in exc.value.detail

def test_register_location_price_validation(db_session: Session, service_setup):
    user_id = service_setup["user_id"]

    # max_price < min_price
    invalid_data = make_location_data(min_price=Decimal("20000"), max_price=Decimal("10000"))

    with pytest.raises(HTTPException) as exc:
        register_location(db_session, user_id, invalid_data)
    assert exc.value.status_code == 400
    assert "max_price phải lớn hơn hoặc bằng min_price" in exc.value.detail

def test_register_location_city_exists_validation(db_session: Session, service_setup):
    user_id = service_setup["user_id"]

    # city_id 999 does not exist
    invalid_data = make_location_data(city_id=999)

    with pytest.raises(HTTPException) as exc:
        register_location(db_session, user_id, invalid_data)
    assert exc.value.status_code == 400
    assert "Thành phố có ID 999 không tồn tại" in exc.value.detail

def test_register_location_duplicate_validation(db_session: Session, service_setup):
    user_id = service_setup["user_id"]

    # Add existing location
    loc = Locations(
        location_id=uuid4(),
        location_name="Bạch Dinh",
        address="Trần Phú, Vũng Tàu",
        city_id=10,
        open_time=time(8, 0),
        close_time=time(17, 0),
        min_price=Decimal("10000"),
        max_price=Decimal("20000"),
        is_active=True
    )
    db_session.add(loc)
    db_session.commit()

    duplicate_data = make_location_data()

    with pytest.raises(HTTPException) as exc:
        register_location(db_session, user_id, duplicate_data)
    assert exc.value.status_code == 400
    assert "đã tồn tại trong thành phố này" in exc.value.detail

def test_register_location_success(db_session: Session, service_setup):
    user_id = service_setup["user_id"]

    data = make_location_data(
        location_name="Văn Miếu Quốc Tử Giám",
        address="Hà Nội",
        min_price=Decimal("30000"),
        max_price=Decimal("30000"),
    )

    result = register_location(db_session, user_id, data)
    assert result.status == "PENDING"
    assert result.message == "Đã gửi yêu cầu đăng ký địa điểm. Địa điểm sẽ hiển thị sau khi Admin duyệt."
    assert result.pending_data["location_name"] == "Văn Miếu Quốc Tử Giám"
    assert result.pending_data["images"] == ["https://example.com/location.jpg"]
    assert result.pending_data["photo_task"]["title"] == "Chụp ảnh tại địa điểm"
    assert result.pending_data["qa_task"]["correct_answer"] == "A"
    assert result.pending_data["qr_task"]["server_generated"] is True


def test_register_location_rejects_duplicate_pending_submission(db_session: Session, service_setup):
    user_id = service_setup["user_id"]

    data = make_location_data(location_name="Bảo tàng Mỹ thuật")
    first_result = register_location(db_session, user_id, data)
    assert first_result.status == "PENDING"

    with pytest.raises(HTTPException) as exc:
        register_location(db_session, user_id, data)

    assert exc.value.status_code == 409
    assert "đã có yêu cầu đang chờ duyệt" in exc.value.detail
