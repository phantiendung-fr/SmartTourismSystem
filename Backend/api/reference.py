"""
api/reference.py - Expose cities and tags for the frontend to fetch dynamically.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import get_session
from schemas import CityResponse, TagResponse
from crud.crud_reference import get_active_cities, get_all_tags

router = APIRouter(prefix="/api/reference", tags=["Reference - Dữ liệu tham chiếu"])


@router.get("/cities", response_model=list[CityResponse], summary="Lấy danh sách thành phố")
def list_cities(db: Session = Depends(get_session)):
    return get_active_cities(db)


@router.get("/tags", response_model=list[TagResponse], summary="Lấy danh sách tag sở thích")
def list_tags(db: Session = Depends(get_session)):
    return get_all_tags(db)
