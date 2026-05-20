from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from database import get_session
from models import (
    PhotoTasks, 
    UserTaskProgress, 
    TaskSubmissions, 
    ItineraryExp, 
    Locations, 
    Users, 
    UserProfiles, 
    ProgressStatusEnum, 
    SubmissionStatusEnum
)
from core.gps import calculate_haversine_distance
from services.ai_verification import verify_image_with_gemini

router = APIRouter(prefix="/api/gamification", tags=["Gamification"])

@router.get("/locations/{location_id}/tasks")
def get_location_tasks(
    location_id: UUID, 
    itinerary_id: UUID,
    user_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Lấy danh sách các task tại địa điểm kèm theo trạng thái thực hiện của User trong Itinerary hiện tại.
    """
    # 1. Check if location exists
    location = session.get(Locations, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa điểm du lịch này.")

    # 2. Get all active tasks at this location
    tasks = session.exec(
        select(PhotoTasks).where(PhotoTasks.location_id == location_id, PhotoTasks.is_active == True)
    ).all()
    
    if not tasks:
        return []
        
    task_ids = [t.task_id for t in tasks]
    
    # 3. Get all user progress for these tasks in ONE query (Fix N+1 latency)
    progress_list = session.exec(
        select(UserTaskProgress).where(
            UserTaskProgress.user_id == user_id,
            UserTaskProgress.itinerary_id == itinerary_id,
            UserTaskProgress.task_id.in_(task_ids)
        )
    ).all()
    
    progress_map = {p.task_id: p for p in progress_list}
    
    result = []
    for task in tasks:
        progress = progress_map.get(task.task_id)
        
        status = "NOT_STARTED"
        if progress:
            status = progress.status.value
            
        result.append({
            "task_id": task.task_id,
            "title": task.title,
            "description": task.description,
            "task_type": task.task_type,
            "reward_exp": task.reward_exp,
            "difficulty": task.difficulty,
            "radius_meters": task.radius_meters,
            "status": status,
            "progress_id": progress.progress_id if progress else None,
            "target_latitude": float(task.latitude),
            "target_longitude": float(task.longitude),
            "reference_image_url": task.reference_image_url
        })
        
    return result

@router.post("/tasks/{task_id}/start")
def start_task(
    task_id: UUID,
    user_id: UUID,
    itinerary_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Bắt đầu làm một nhiệm vụ (Khởi tạo tiến trình IN_PROGRESS)
    """
    # 1. Kiểm tra xem task có tồn tại không
    task = session.get(PhotoTasks, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ này.")
        
    # 2. Kiểm tra xem đã tồn tại tiến trình chưa
    existing_progress = session.exec(
        select(UserTaskProgress).where(
            UserTaskProgress.user_id == user_id,
            UserTaskProgress.task_id == task_id,
            UserTaskProgress.itinerary_id == itinerary_id
        )
    ).first()
    
    if existing_progress:
        if existing_progress.status == ProgressStatusEnum.CANCELLED:
            existing_progress.status = ProgressStatusEnum.IN_PROGRESS
            session.add(existing_progress)
            session.commit()
            session.refresh(existing_progress)
            return {
                "message": "Đã bắt đầu lại nhiệm vụ thành công!", 
                "progress_id": existing_progress.progress_id,
                "status": "IN_PROGRESS"
            }
        return {
            "message": "Nhiệm vụ đã được bắt đầu từ trước.", 
            "progress_id": existing_progress.progress_id,
            "status": "IN_PROGRESS" if existing_progress.status == ProgressStatusEnum.IN_PROGRESS else "COMPLETED"
        }
        
    # 3. Tạo mới tiến trình
    new_progress = UserTaskProgress(
        user_id=user_id,
        task_id=task_id,
        itinerary_id=itinerary_id,
        location_id=task.location_id,
        status=ProgressStatusEnum.IN_PROGRESS
    )
    session.add(new_progress)
    session.commit()
    session.refresh(new_progress)
    
    return {"message": "Đã bắt đầu nhiệm vụ thành công!", "progress_id": new_progress.progress_id, "status": "IN_PROGRESS"}

@router.post("/tasks/{task_id}/cancel")
def cancel_task(
    task_id: UUID,
    user_id: UUID,
    itinerary_id: UUID,
    session: Session = Depends(get_session)
):
    """
    Hủy thực hiện một nhiệm vụ (chuyển sang CANCELLED)
    """
    # 1. Tìm tiến trình đang thực hiện của nhiệm vụ này
    progress = session.exec(
        select(UserTaskProgress).where(
            UserTaskProgress.user_id == user_id,
            UserTaskProgress.task_id == task_id,
            UserTaskProgress.itinerary_id == itinerary_id
        )
    ).first()
    
    if not progress:
        # Nếu chưa có tiến trình, tạo mới với status CANCELLED
        task = session.get(PhotoTasks, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ.")
        progress = UserTaskProgress(
            user_id=user_id,
            task_id=task_id,
            itinerary_id=itinerary_id,
            location_id=task.location_id,
            status=ProgressStatusEnum.CANCELLED
        )
        session.add(progress)
    else:
        if progress.status == ProgressStatusEnum.COMPLETED:
            raise HTTPException(status_code=400, detail="Không thể hủy nhiệm vụ đã hoàn thành.")
        progress.status = ProgressStatusEnum.CANCELLED
        session.add(progress)
        
    session.commit()
    return {"message": "Đã hủy nhiệm vụ thành công!", "status": "CANCELLED"}

@router.post("/submissions/submit-photo")
async def submit_photo_task(
    progress_id: UUID = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    photo: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Nộp ảnh thực hiện nhiệm vụ chụp ảnh: Kiểm tra GPS -> Xác thực AI -> Cộng thưởng.
    """
    # 1. Lấy thông tin tiến trình và nhiệm vụ
    progress = session.get(UserTaskProgress, progress_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Tiến trình làm nhiệm vụ không tồn tại.")
    if progress.status == ProgressStatusEnum.COMPLETED:
        raise HTTPException(status_code=400, detail="Nhiệm vụ này đã được hoàn thành trước đó.")
        
    task = session.get(PhotoTasks, progress.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin nhiệm vụ tương ứng.")
        
    location = session.get(Locations, progress.location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa điểm du lịch tương ứng.")
    
    # 2. XÁC THỰC GPS: Tính khoảng cách từ toạ độ user tới toạ độ thực tế của nhiệm vụ
    distance = calculate_haversine_distance(
        latitude, longitude, 
        float(task.latitude), float(task.longitude)
    )
    
    # Cho phép sai số bán kính nhiệm vụ
    if distance > task.radius_meters:
        raise HTTPException(
            status_code=400, 
            detail=f"Bạn chưa tới đúng địa điểm. Khoảng cách hiện tại: {round(distance, 1)}m. Yêu cầu trong phạm vi {task.radius_meters}m."
        )

    # 3. ĐỌC DỮ LIỆU FILE VÀ MOCK LƯU TRỮ TRONG DEMO
    # Trong môi trường thực tế: tải ảnh lên Supabase Storage qua client
    photo_bytes = await photo.read()
    filename = f"{progress.user_id}/{task.task_id}_{int(datetime.utcnow().timestamp())}.jpg"
    
    # URL demo giả lập
    uploaded_image_url = f"https://your-project.supabase.co/storage/v1/object/public/task-images/{filename}"

    # 4. XÁC THỰC ẢNH QUA GEMINI AI (Hoặc CLIP fallback)
    if not task.reference_image_url or str(task.reference_image_url).strip() == "":
        ai_result = {
            "is_matched": False, 
            "confidence_score": 0.0, 
            "anti_cheat_passed": False, 
            "reason": "Nhiệm vụ này chưa được cấu hình ảnh mẫu (reference_image) trong cơ sở dữ liệu để AI có thể đối chiếu."
        }
    else:
        ai_result = await verify_image_with_gemini(photo_bytes, task.reference_image_url)

    # 5. LƯU LỊCH SỬ SUBMISSION
    submission = TaskSubmissions(
        progress_id=progress.progress_id,
        submitted_image_url=uploaded_image_url,
        submitted_latitude=Decimal(str(latitude)),
        submitted_longitude=Decimal(str(longitude)),
        distance_meters=distance,
        confidence_score=ai_result["confidence_score"],
        status=SubmissionStatusEnum.APPROVED if (ai_result["is_matched"] and ai_result["anti_cheat_passed"]) else SubmissionStatusEnum.REJECTED
    )
    session.add(submission)
    session.commit()

    # Double-check server-side: enforce minimum threshold regardless of AI is_matched flag
    MIN_CONFIDENCE = 60.0
    if (
        not ai_result.get("anti_cheat_passed", False)
        or float(ai_result.get("confidence_score", 0.0)) < MIN_CONFIDENCE
        or not ai_result.get("is_matched", False)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Xác thực ảnh thất bại: {ai_result.get('reason', 'Ảnh không hợp lệ.')} "
                f"(Độ tương đồng: {ai_result.get('confidence_score', 0.0)}% — Yêu cầu tối thiểu: {MIN_CONFIDENCE}%)"
            )
        )

    # 6. TRANSACTION HOÀN THÀNH & CỘNG THƯỞNG
    # Cập nhật trạng thái tiến trình
    progress.status = ProgressStatusEnum.COMPLETED
    progress.completed_at = datetime.utcnow()
    session.add(progress)
    
    # Cộng EXP Lộ trình (Itinerary EXP)
    iti_exp = session.get(ItineraryExp, progress.itinerary_id)
    if not iti_exp:
        iti_exp = ItineraryExp(itinerary_id=progress.itinerary_id, total_exp=0, current_level=1)
    
    iti_exp.total_exp += task.reward_exp
    iti_exp.current_level = (iti_exp.total_exp // 1000) + 1
    iti_exp.updated_at = datetime.utcnow()
    session.add(iti_exp)
    
    # Cộng điểm thưởng vào User Profile
    profile = session.exec(
        select(UserProfiles).where(UserProfiles.user_id == progress.user_id)
    ).first()
    if profile:
        profile.total_points += task.reward_exp
        profile.points_balance += task.reward_exp
        profile.updated_at = datetime.utcnow()
        session.add(profile)
        
    session.commit()
    
    return {
        "status": "SUCCESS",
        "message": "Chúc mừng! Bạn đã hoàn thành nhiệm vụ xuất sắc!",
        "exp_rewarded": task.reward_exp,
        "new_itinerary_exp": iti_exp.total_exp,
        "new_level": iti_exp.current_level,
        "confidence_score": ai_result["confidence_score"]
    }
