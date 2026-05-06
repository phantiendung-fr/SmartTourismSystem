# ============================================================
# crud/crud_trip.py  –  Itinerary / Trip CRUD operations
# ============================================================

from datetime import datetime
from decimal import Decimal
from typing import Optional, Sequence
from uuid import UUID

from sqlmodel import Session, select

from models import (
    CheckinProgress,
    CurrencyEnum,
    DeviationLogs,
    GpsTrackingLogs,
    Itineraries,
    ItineraryDays,
    ItineraryRoutes,
    ItineraryStatus,
    ItineraryStops,
    Locations,
    PlanningSessions,
    StopStatus,
    TravelRequestPreferences,
)
from schemas import ItineraryCreate


# ---------------------------------------------------------------------------
# Planning Sessions
# ---------------------------------------------------------------------------

def get_planning_session(db: Session, session_id: UUID) -> Optional[PlanningSessions]:
    """Lấy planning session theo ID."""
    return db.get(PlanningSessions, session_id)


def get_session_preference_tag_ids(db: Session, session_id: UUID) -> list[int]:
    """Lấy danh sách tag_id preferences của 1 planning session."""
    statement = (
        select(TravelRequestPreferences.tag_id)
        .where(TravelRequestPreferences.session_id == session_id)
    )
    return list(db.exec(statement).all())


# ---------------------------------------------------------------------------
# Create  (transactional) – original
# ---------------------------------------------------------------------------

def create_itinerary_with_days(
    db: Session,
    user_id: UUID,
    session_id: UUID,
    itinerary_in: ItineraryCreate,
    days_data: list[dict],
) -> Itineraries:
    """
    Create an ``Itineraries`` row **and** its child ``ItineraryDays``
    inside a single transaction.

    If inserting any ``ItineraryDays`` fails, the entire operation
    (including the parent ``Itineraries`` row) is rolled back to
    guarantee data integrity.

    Parameters
    ----------
    db : Session
        Active SQLModel / SQLAlchemy session.
    user_id : UUID
        Owner of the itinerary.
    session_id : UUID
        Related planning session.
    itinerary_in : ItineraryCreate
        Basic itinerary payload from the client.
    days_data : list[dict]
        Each dict should contain at minimum::

            {
                "day_order": int,
                "travel_date": date,
                "estimated_budget": Decimal,
                "total_time": int,          # minutes
                "currency": "VND" | "USD",  # optional, defaults to VND
            }

    Returns
    -------
    Itineraries
        The newly created itinerary (refreshed from DB).

    Raises
    ------
    Exception
        Re-raises any error after rolling back the transaction.
    """
    try:
        # --- 1. Insert parent: Itineraries --------------------------------
        itinerary = Itineraries(
            session_id=session_id,
            user_id=user_id,
            status=ItineraryStatus.DRAFT,
            total_budget=itinerary_in.budget,
            currency=CurrencyEnum.VND,
            total_travel_time=0,
            total_distance=0,
        )
        db.add(itinerary)
        # Flush to obtain itinerary_id without committing
        db.flush()

        # --- 2. Insert children: ItineraryDays ----------------------------
        for day in days_data:
            itinerary_day = ItineraryDays(
                itinerary_id=itinerary.itinerary_id,
                day_order=day["day_order"],
                travel_date=day["travel_date"],
                estimated_budget=day["estimated_budget"],
                currency=day.get("currency", CurrencyEnum.VND),
                total_time=day.get("total_time", 0),
            )
            db.add(itinerary_day)

        # --- 3. Commit the whole transaction ------------------------------
        db.commit()
        db.refresh(itinerary)
        return itinerary

    except Exception:
        db.rollback()
        raise


# ---------------------------------------------------------------------------
# Create – full itinerary with days + stops + routes
# ---------------------------------------------------------------------------

def create_full_itinerary(
    db: Session,
    user_id: UUID,
    session_id: UUID,
    total_budget: Decimal,
    total_travel_time: int,
    total_distance: Decimal,
    days_data: list[dict],
) -> Itineraries:
    """
    Tạo itinerary hoàn chỉnh gồm days, stops, routes trong 1 transaction.

    Parameters
    ----------
    days_data : list[dict]
        Mỗi dict chứa::

            {
                "day_order": int,
                "travel_date": date,
                "estimated_budget": Decimal,
                "total_time": int,
                "stops": [
                    {
                        "location_id": UUID,
                        "stop_order": int,
                        "arrival_time": time,
                        "departure_time": time,
                        "checkin_radius": int,
                        "reward": int,
                    },
                    ...
                ],
                "routes": [
                    {
                        "from_stop_order": int,  # sẽ được map sau flush
                        "to_stop_order": int,
                        "travel_time": int,
                        "distance": Decimal,
                        "polyline_data": str,
                    },
                    ...
                ],
            }
    """
    try:
        # 1. Itinerary
        itinerary = Itineraries(
            session_id=session_id,
            user_id=user_id,
            status=ItineraryStatus.DRAFT,
            total_budget=total_budget,
            currency=CurrencyEnum.VND,
            total_travel_time=total_travel_time,
            total_distance=total_distance,
        )
        db.add(itinerary)
        db.flush()

        for day_data in days_data:
            # 2. Day
            day = ItineraryDays(
                itinerary_id=itinerary.itinerary_id,
                day_order=day_data["day_order"],
                travel_date=day_data["travel_date"],
                estimated_budget=day_data.get("estimated_budget", Decimal("0")),
                currency=CurrencyEnum.VND,
                total_time=day_data.get("total_time", 0),
            )
            db.add(day)
            db.flush()  # để lấy day_id

            # 3. Stops – lưu mapping stop_order → stop_id
            stop_order_to_id: dict[int, int] = {}
            for stop_data in day_data.get("stops", []):
                stop = ItineraryStops(
                    day_id=day.day_id,
                    location_id=stop_data["location_id"],
                    stop_order=stop_data["stop_order"],
                    arrival_time=stop_data["arrival_time"],
                    departure_time=stop_data["departure_time"],
                    checkin_radius=stop_data.get("checkin_radius", 100),
                    reward=stop_data.get("reward", 10),
                    status=StopStatus.PENDING,
                )
                db.add(stop)
                db.flush()
                stop_order_to_id[stop_data["stop_order"]] = stop.stop_id  # type: ignore

            # 4. Routes
            for route_data in day_data.get("routes", []):
                from_id = stop_order_to_id.get(route_data["from_stop_order"])
                to_id = stop_order_to_id.get(route_data["to_stop_order"])
                if from_id is not None and to_id is not None:
                    route = ItineraryRoutes(
                        from_stop_id=from_id,
                        to_stop_id=to_id,
                        travel_time=route_data["travel_time"],
                        distance=route_data["distance"],
                        polyline_data=route_data["polyline_data"],
                    )
                    db.add(route)

        db.commit()
        db.refresh(itinerary)
        return itinerary

    except Exception:
        db.rollback()
        raise


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------

def get_user_itineraries(
    db: Session,
    user_id: UUID,
) -> Sequence[Itineraries]:
    """
    Return all itineraries belonging to *user_id*, newest first.
    """
    statement = (
        select(Itineraries)
        .where(Itineraries.user_id == user_id)
        .order_by(Itineraries.create_at.desc())  # type: ignore[union-attr]
    )
    return db.exec(statement).all()


def get_itinerary_by_id(
    db: Session,
    itinerary_id: UUID,
) -> Optional[Itineraries]:
    """
    Fetch a single itinerary by its primary key.
    """
    return db.get(Itineraries, itinerary_id)


def get_itinerary_days(db: Session, itinerary_id: UUID) -> Sequence[ItineraryDays]:
    """Lấy tất cả days của 1 itinerary, sắp theo day_order."""
    statement = (
        select(ItineraryDays)
        .where(ItineraryDays.itinerary_id == itinerary_id)
        .order_by(ItineraryDays.day_order)
    )
    return db.exec(statement).all()


def get_day_stops(db: Session, day_id: int) -> Sequence[ItineraryStops]:
    """Lấy tất cả stops của 1 day, sắp theo stop_order."""
    statement = (
        select(ItineraryStops)
        .where(ItineraryStops.day_id == day_id)
        .order_by(ItineraryStops.stop_order)
    )
    return db.exec(statement).all()


def get_stop_by_id(db: Session, stop_id: int) -> Optional[ItineraryStops]:
    """Lấy 1 stop theo ID."""
    return db.get(ItineraryStops, stop_id)


def get_all_stops_for_itinerary(db: Session, itinerary_id: UUID) -> Sequence[ItineraryStops]:
    """Lấy tất cả stops của 1 itinerary (qua join với days)."""
    statement = (
        select(ItineraryStops)
        .join(ItineraryDays, ItineraryStops.day_id == ItineraryDays.day_id)
        .where(ItineraryDays.itinerary_id == itinerary_id)
        .order_by(ItineraryDays.day_order, ItineraryStops.stop_order)
    )
    return db.exec(statement).all()


def get_routes_for_day(db: Session, day_id: int) -> Sequence[ItineraryRoutes]:
    """Lấy routes giữa các stops trong 1 day."""
    # Get stop_ids for this day first
    stop_ids_stmt = (
        select(ItineraryStops.stop_id)
        .where(ItineraryStops.day_id == day_id)
    )
    stop_ids = list(db.exec(stop_ids_stmt).all())

    if not stop_ids:
        return []

    statement = (
        select(ItineraryRoutes)
        .where(ItineraryRoutes.from_stop_id.in_(stop_ids))  # type: ignore[union-attr]
    )
    return db.exec(statement).all()


# ---------------------------------------------------------------------------
# Check-in
# ---------------------------------------------------------------------------

def get_checkin_by_user_and_stop(
    db: Session, user_id: UUID, stop_id: int,
) -> Optional[CheckinProgress]:
    """Kiểm tra user đã check-in tại stop này chưa."""
    statement = (
        select(CheckinProgress)
        .where(
            CheckinProgress.user_id == user_id,
            CheckinProgress.stop_id == stop_id,
        )
    )
    return db.exec(statement).first()


def create_checkin(
    db: Session,
    user_id: UUID,
    stop_id: int,
    latitude: Decimal,
    longitude: Decimal,
) -> CheckinProgress:
    """Tạo bản ghi check-in mới."""
    try:
        checkin = CheckinProgress(
            user_id=user_id,
            stop_id=stop_id,
            is_completed=True,
            latitude=latitude,
            longitude=longitude,
        )
        db.add(checkin)

        # Cập nhật trạng thái stop
        stop = db.get(ItineraryStops, stop_id)
        if stop:
            stop.status = StopStatus.COMPLETED

        db.commit()
        db.refresh(checkin)
        return checkin
    except Exception:
        db.rollback()
        raise


# ---------------------------------------------------------------------------
# GPS Tracking & Deviation Logs
# ---------------------------------------------------------------------------

def create_gps_log(
    db: Session,
    progress_id: int,
    latitude: Decimal,
    longitude: Decimal,
) -> GpsTrackingLogs:
    """Lưu GPS tracking log."""
    log = GpsTrackingLogs(
        progress_id=progress_id,
        latitude=latitude,
        longitude=longitude,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def create_deviation_log(
    db: Session,
    itinerary_id: UUID,
    latitude: Decimal,
    longitude: Decimal,
) -> DeviationLogs:
    """Lưu cảnh báo chệch hướng."""
    log = DeviationLogs(
        itinerary_id=itinerary_id,
        latitude=latitude,
        longitude=longitude,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
