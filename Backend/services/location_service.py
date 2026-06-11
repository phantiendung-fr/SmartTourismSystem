"""
services/location_service.py - Enterprise location registration workflow.

Enterprise submissions are moderated: this service validates and geocodes the
payload, then stores a PENDING LocationSubmissions row. Admin approval is the
only path that creates/updates real Locations rows.
"""

from __future__ import annotations

import json
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from crud.crud_location import check_location_exists
from models import Categories, EnterpriseProfiles, EnterpriseStatus, LocationSubmissions, Tags
from schemas import LocationCreate, LocationRegisterResponse


def _get_enterprise_by_user(db: Session, user_id: UUID) -> EnterpriseProfiles:
    enterprise = db.exec(
        select(EnterpriseProfiles).where(EnterpriseProfiles.user_id == user_id)
    ).first()
    if enterprise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ doanh nghiệp cho user này.",
        )
    if enterprise.status != EnterpriseStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hồ sơ doanh nghiệp chưa được duyệt nên chưa thể đăng ký địa điểm.",
        )
    return enterprise


def _resolve_coordinates(address: str) -> tuple[float, float]:
    """
    Temporary local coordinate resolver for the current POC environment.
    """
    import random
    
    address_lower = address.lower()
    
    # Thêm độ lệch ngẫu nhiên nhỏ (khoảng 10-20m) để tránh trùng lặp tọa độ tuyệt đối
    offset_lat = (random.random() - 0.5) * 0.0002
    offset_lon = (random.random() - 0.5) * 0.0002

    if "hà nội" in address_lower or "hanoi" in address_lower:
        return 21.027764 + offset_lat, 105.834160 + offset_lon
    if "đà nẵng" in address_lower or "da nang" in address_lower:
        return 16.054407 + offset_lat, 108.202167 + offset_lon
    return 10.776797 + offset_lat, 106.700981 + offset_lon


def _find_pending_duplicate_submission(
    db: Session,
    enterprise_id: UUID,
    location_name: str,
    city_id: int,
) -> LocationSubmissions | None:
    pending_submissions = db.exec(
        select(LocationSubmissions).where(
            LocationSubmissions.enterprise_id == enterprise_id,
            LocationSubmissions.type == "CREATE",
            LocationSubmissions.status == "PENDING",
        )
    ).all()
    normalized_name = location_name.strip().lower()
    for submission in pending_submissions:
        try:
            pending_data = json.loads(submission.data_json or "{}")
            pending_city_id = int(pending_data.get("city_id", 0))
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
        if (
            str(pending_data.get("location_name", "")).strip().lower() == normalized_name
            and pending_city_id == int(city_id)
        ):
            return submission
    return None


def register_location(
    db: Session,
    user_id: UUID,
    data: LocationCreate,
) -> LocationRegisterResponse:
    enterprise = _get_enterprise_by_user(db, user_id)

    if data.close_time <= data.open_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="close_time phải lớn hơn open_time.",
        )

    if data.max_price < data.min_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_price phải lớn hơn hoặc bằng min_price.",
        )

    if data.latitude is None or data.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập GPS latitude và longitude của địa điểm.",
        )

    if not data.category_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng chọn ít nhất một danh mục địa điểm.",
        )

    if not data.tag_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng chọn ít nhất một tag phù hợp để địa điểm có thể được gợi ý cho người dùng.",
        )

    image_urls = [url.strip() for url in data.image_urls if url and url.strip()]
    if not image_urls:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp ít nhất một ảnh địa điểm.",
        )

    qa_fields = [
        data.qa_question,
        data.qa_option_a,
        data.qa_option_b,
        data.qa_option_c,
        data.qa_option_d,
        data.qa_correct_answer,
    ]
    if any(not str(value or "").strip() for value in qa_fields):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập đầy đủ câu hỏi, 4 đáp án và đáp án đúng cho nhiệm vụ QA.",
        )

    if not data.photo_task_title.strip() or not data.reference_image_url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập tiêu đề nhiệm vụ ảnh và ảnh mẫu để AI đối chiếu.",
        )

    from models import Cities
    city = db.exec(select(Cities).where(Cities.city_id == data.city_id)).first()
    if city is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Thành phố có ID {data.city_id} không tồn tại. Vui lòng chọn thành phố khác.",
        )

    existing_categories = set(
        db.exec(select(Categories.category_id).where(Categories.category_id.in_(data.category_ids))).all()
    )
    missing_categories = sorted(set(data.category_ids) - existing_categories)
    if missing_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Danh mục không tồn tại: {missing_categories}",
        )

    existing_tags = set(
        db.exec(select(Tags.tag_id).where(Tags.tag_id.in_(data.tag_ids))).all()
    )
    missing_tags = sorted(set(data.tag_ids) - existing_tags)
    if missing_tags:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tag không tồn tại: {missing_tags}",
        )

    existing = check_location_exists(db, data.location_name, data.city_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Địa điểm '{data.location_name}' đã tồn tại trong thành phố này "
                f"(location_id={existing.location_id}). Vui lòng chọn tên khác."
            ),
        )

    duplicate_submission = _find_pending_duplicate_submission(
        db,
        enterprise.enterprise_id,
        data.location_name,
        data.city_id,
    )
    if duplicate_submission is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Địa điểm '{data.location_name}' đã có yêu cầu đang chờ duyệt "
                f"(submission_id={duplicate_submission.submission_id})."
            ),
        )

    latitude = float(data.latitude)
    longitude = float(data.longitude)
    pending_data = {
        "location_name": data.location_name,
        "address": data.address,
        "latitude": latitude,
        "longitude": longitude,
        "city_id": data.city_id,
        "open_time": data.open_time.strftime("%H:%M:%S"),
        "close_time": data.close_time.strftime("%H:%M:%S"),
        "min_price": str(data.min_price),
        "max_price": str(data.max_price),
        "currency": getattr(data.currency, "value", data.currency),
        "category_ids": data.category_ids,
        "tag_ids": data.tag_ids,
        "images": image_urls,
        "photo_task": {
            "title": data.photo_task_title.strip(),
            "description": (data.photo_task_description or "").strip() or None,
            "reference_image_url": data.reference_image_url.strip(),
            "reward_exp": data.photo_reward_exp,
            "radius_meters": data.photo_radius_meters,
        },
        "qa_task": {
            "question": data.qa_question.strip(),
            "option_a": data.qa_option_a.strip(),
            "option_b": data.qa_option_b.strip(),
            "option_c": data.qa_option_c.strip(),
            "option_d": data.qa_option_d.strip(),
            "correct_answer": data.qa_correct_answer.strip().upper(),
            "difficulty": data.qa_difficulty.strip().lower() or "easy",
            "reward_exp": data.qa_reward_exp,
            "reward_coin": data.qa_reward_coin,
        },
        "qr_task": {
            "reward_exp": data.qr_reward_exp,
            "reward_coin": data.qr_reward_coin,
            "valid_days": data.qr_valid_days,
            "server_generated": True,
        },
    }

    try:
        submission = LocationSubmissions(
            enterprise_id=enterprise.enterprise_id,
            type="CREATE",
            status="PENDING",
            data_json=json.dumps(pending_data, ensure_ascii=False),
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lưu yêu cầu đăng ký địa điểm: {exc}",
        ) from exc

    return LocationRegisterResponse(
        submission_id=submission.submission_id,
        status=submission.status,
        pending_data=pending_data,
        message="Đã gửi yêu cầu đăng ký địa điểm. Địa điểm sẽ hiển thị sau khi Admin duyệt.",
    )
