# File mới: crud/crud_planning.py
from typing import Optional
from uuid import UUID
from sqlmodel import Session
from models import PlanningSessions, PlanningStatus
from schemas import PlanningSessionCreate

def create_planning_session(db: Session, user_id: UUID, plan_in: PlanningSessionCreate) -> PlanningSessions:
    """Khởi tạo một phiên lên lịch trình mới và lưu các ràng buộc."""
    db_plan = PlanningSessions(
        user_id=user_id,
        city_id=plan_in.city_id,
        pax_adult=plan_in.pax_adult,
        pax_children=plan_in.pax_children,
        budget=plan_in.budget,
        currency=plan_in.currency,
        start_day=plan_in.start_day,
        end_day=plan_in.end_day,
        status=PlanningStatus.PROCESSING
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

def get_planning_session(db: Session, session_id: UUID) -> Optional[PlanningSessions]:
    """Lấy thông tin phiên lên lịch trình theo ID."""
    return db.get(PlanningSessions, session_id)

def update_planning_status(db: Session, session_id: UUID, status: PlanningStatus) -> Optional[PlanningSessions]:
    """Cập nhật trạng thái (PROCESSING -> SUGGESTING -> CONFIRMED)."""
    db_plan = db.get(PlanningSessions, session_id)
    if db_plan:
        db_plan.status = status
        db.add(db_plan)
        db.commit()
        db.refresh(db_plan)
    return db_plan