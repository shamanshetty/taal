from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.db_models import User
from app.models.schemas import UserCreate, UserResponse
from app.services import user_service

router = APIRouter()


def _serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        db_user = user_service.register_user(db, user)
        return _serialize_user(db_user)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/profile/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """Get user profile"""
    user = user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialize_user(user)
