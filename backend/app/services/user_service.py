from typing import Optional

import httpx
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.db_models import User
from app.models.schemas import UserCreate

_USER_TABLES_WITH_FOREIGN_KEY = [
    "income_sources",
    "clients",
    "transactions",
    "invoices",
    "compliance_tasks",
    "goals",
    "pulse_history",
    "chat_messages",
    "tax_records",
    "whatsapp_nudges",
    "agent_memories",
]


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


def _migrate_user_id(db: Session, old_user_id: str, new_user_id: str) -> None:
    for table in _USER_TABLES_WITH_FOREIGN_KEY:
        db.execute(
            text(f"UPDATE {table} SET user_id = :new WHERE user_id = :old"),
            {"new": new_user_id, "old": old_user_id},
        )
    db.execute(
        text("UPDATE users SET id = :new WHERE id = :old"),
        {"new": new_user_id, "old": old_user_id},
    )


def sync_user_profile(db: Session, *, user_id: str, email: str, full_name: Optional[str] = None) -> User:
    """Ensure the app DB has a record for the Supabase-authenticated user."""
    user_id = str(user_id)
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        updated = False
        if full_name and (not user.full_name or user.full_name.strip() == ""):
            user.full_name = full_name
            updated = True
        if email and user.email != email:
            user.email = email
            updated = True
        if updated:
            db.commit()
            db.refresh(user)
        return user

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if str(existing.id) != user_id:
            _migrate_user_id(db, str(existing.id), user_id)
            db.commit()
            migrated = db.query(User).filter(User.id == user_id).first()
            if not migrated:
                raise RuntimeError("Unable to reassign user id")
            user = migrated
        else:
            user = existing
    else:
        user = User(id=user_id, email=email, full_name=full_name)
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing_after_conflict = db.query(User).filter(User.email == email).first()
            if existing_after_conflict:
                return existing_after_conflict
            raise
        db.refresh(user)
        return user

    updated = False
    if full_name and (not user.full_name or user.full_name.strip() == ""):
        user.full_name = full_name
        updated = True
    if email and user.email != email:
        user.email = email
        updated = True
    if updated:
        db.commit()
        db.refresh(user)
    return user
