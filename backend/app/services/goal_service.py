from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.db_models import Goal
from app.models.schemas import GoalCreate, GoalUpdate


def _to_decimal(value: float) -> Decimal:
    return Decimal(str(value))


def create_goal(db: Session, user_id: str, payload: GoalCreate) -> Goal:
    goal = Goal(
        user_id=user_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        status=payload.status,
        priority=payload.priority,
        target_amount=_to_decimal(payload.target_amount),
        current_amount=_to_decimal(payload.current_amount),
        deadline=payload.deadline,
        monthly_contribution=_to_decimal(payload.monthly_contribution),
        required_monthly=_to_decimal(payload.required_monthly),
        icon_key=payload.icon_key,
        tags=payload.tags,
        notes=payload.notes,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def list_goals(db: Session, user_id: str) -> List[Goal]:
    return db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.desc()).all()


def update_goal(db: Session, goal_id: str, payload: GoalUpdate) -> Goal:
    goal: Optional[Goal] = db.query(Goal).filter(Goal.id == goal_id).first()
    if goal is None:
        raise ValueError("Goal not found")

    if payload.title is not None:
        goal.title = payload.title
    if payload.description is not None:
        goal.description = payload.description
    if payload.category is not None:
        goal.category = payload.category
    if payload.status is not None:
        goal.status = payload.status
    if payload.priority is not None:
        goal.priority = payload.priority
    if payload.target_amount is not None:
        goal.target_amount = _to_decimal(payload.target_amount)
    if payload.current_amount is not None:
        goal.current_amount = _to_decimal(payload.current_amount)
    if payload.deadline is not None:
        goal.deadline = payload.deadline
    if payload.monthly_contribution is not None:
        goal.monthly_contribution = _to_decimal(payload.monthly_contribution)
    if payload.required_monthly is not None:
        goal.required_monthly = _to_decimal(payload.required_monthly)
    if payload.icon_key is not None:
        goal.icon_key = payload.icon_key
    if payload.tags is not None:
        goal.tags = payload.tags
    if payload.notes is not None:
        goal.notes = payload.notes

    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, goal_id: str) -> None:
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if goal is None:
        raise ValueError("Goal not found")

    db.delete(goal)
    db.commit()
