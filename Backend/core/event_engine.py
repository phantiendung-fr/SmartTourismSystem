import logging
import random
from uuid import UUID
from datetime import datetime
from sqlmodel import Session, select
from typing import Dict, Any, Callable

# Note: Adjust import path according to your actual models location if needed
from models import UserProfiles, UserInventories, ItemType, UserAchievements, AchievementType

logger = logging.getLogger(__name__)

# ============================================================
# EVENT DEFINITIONS
# ============================================================
class GameEvents:
    USER_CHECKIN = "USER_CHECKIN"
    TRIP_PLANNED = "TRIP_PLANNED"
    TRIP_COMPLETED = "TRIP_COMPLETED"
    LEVEL_UP = "LEVEL_UP"

# ============================================================
# UTILITIES
# ============================================================
def calculate_level(exp: int) -> int:
    """Simple calculation: Level = (EXP / 100) + 1"""
    return (exp // 100) + 1

def add_exp(session: Session, user_id: UUID, exp_amount: int):
    user = session.get(UserProfiles, user_id)
    if not user:
        return
    user.current_exp += exp_amount
    new_level = calculate_level(user.current_exp)
    if new_level > user.level:
        user.level = new_level
        # Trigger LEVEL_UP event recursively if needed
        # dispatch_event(session, GameEvents.LEVEL_UP, {"user_id": user_id, "new_level": new_level})
    session.add(user)

# ============================================================
# HANDLERS
# ============================================================
def handle_user_checkin(session: Session, payload: Dict[str, Any]):
    """
    Triggered when a user successfully checks in at a location.
    Payload: {"user_id": UUID, "location_id": UUID, "reward_coins": int, "reward_exp": int}
    """
    user_id = payload.get("user_id")
    exp = payload.get("reward_exp", 50)  # Default EXP per checkin
    coins = payload.get("reward_coins", 10) # Default Coins
    
    if not user_id: return
    
    # 1. Add EXP and potentially level up
    add_exp(session, user_id, exp)
    
    # 2. Add Coins (points_balance)
    user = session.get(UserProfiles, user_id)
    if user:
        user.points_balance += coins
        # Add to total_points as lifetime score metric
        user.total_points += exp 
        session.add(user)
        
    # 3. Loot Box / Gacha Logic
    # 20% chance to find a Shard
    if random.random() < 0.20:
        shard = UserInventories(
            user_id=user_id,
            item_code="MYSTERY_SHARD",
            item_type=ItemType.SHARD,
            quantity=1
        )
        session.add(shard)
        logger.info(f"User {user_id} found a MYSTERY_SHARD!")

def handle_trip_planned(session: Session, payload: Dict[str, Any]):
    """
    Triggered when a user confirms a trip plan.
    Payload: {"user_id": UUID, "itinerary_id": UUID}
    """
    user_id = payload.get("user_id")
    if not user_id: return
    
    # Planning a trip gives 30 EXP
    add_exp(session, user_id, 30)
    logger.info(f"User {user_id} earned 30 EXP for planning a trip.")

# ============================================================
# DISPATCHER
# ============================================================
# Registry mapping events to their handler functions
_event_handlers = {
    GameEvents.USER_CHECKIN: [handle_user_checkin],
    GameEvents.TRIP_PLANNED: [handle_trip_planned]
}

def dispatch_event(session: Session, event_name: str, payload: Dict[str, Any]):
    """
    Synchronous Event Dispatcher.
    In a high-load production environment, you might use FastAPI BackgroundTasks or Celery here.
    """
    logger.info(f"Dispatching Event: {event_name} with payload: {payload}")
    handlers = _event_handlers.get(event_name, [])
    
    for handler in handlers:
        try:
            handler(session, payload)
        except Exception as e:
            logger.error(f"Error executing handler {handler.__name__} for event {event_name}: {e}")
            # Ensure failure in one handler doesn't crash the transaction
            # Note: depending on use case, you might want to raise here
