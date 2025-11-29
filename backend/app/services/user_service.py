from typing import Optional

import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.db_models import User
from app.models.schemas import UserCreate


def _create_supabase_user(payload: UserCreate) -> dict:
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError("Supabase credentials are not configured")

    admin_endpoint = f"{settings.supabase_url}/auth/v1/admin/users"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": "application/json",
    }
    body = {
        "email": payload.email,
        "password": payload.password,
        "email_confirm": True,
        "user_metadata": {"full_name": payload.full_name},
    }

    with httpx.Client(timeout=30) as client:
        response = client.post(admin_endpoint, headers=headers, json=body)
        response.raise_for_status()
        return response.json()


def register_user(db: Session, payload: UserCreate) -> User:
    """Create a Supabase auth user and store metadata in the users table."""
    auth_user = _create_supabase_user(payload)
    user_id = auth_user.get("id")
    if not user_id:
        raise RuntimeError("Supabase did not return a user id")

    db_user = User(
        id=user_id,
        email=auth_user.get("email") or payload.email,
        full_name=payload.full_name,
    )
    db.add(db_user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise RuntimeError("Failed to persist user profile") from exc
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()
