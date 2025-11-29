from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.models.db_models import Goal
from app.models.schemas import GoalCreate, GoalResponse, GoalUpdate
from app.services import goal_service

router = APIRouter()


def _serialize_goal(goal: Goal) -> GoalResponse:
    return GoalResponse(
        id=str(goal.id),
        user_id=str(goal.user_id),
        title=goal.title,
        description=goal.description,
        category=goal.category,
        status=goal.status,
        priority=goal.priority,
        target_amount=float(goal.target_amount),
        current_amount=float(goal.current_amount),
        deadline=goal.deadline,
        monthly_contribution=float(goal.monthly_contribution),
        required_monthly=float(goal.required_monthly),
        icon_key=goal.icon_key,
        tags=goal.tags,
        notes=goal.notes,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


@router.post("/", response_model=GoalResponse)
async def create_goal(goal: GoalCreate, user_id: str = Query(...), db: Session = Depends(get_db)):
    """Create a new financial goal"""
    db_goal = goal_service.create_goal(db, user_id, goal)
    return _serialize_goal(db_goal)


@router.get("/", response_model=List[GoalResponse])
async def get_goals(user_id: str = Query(...), db: Session = Depends(get_db)):
    """Get user's financial goals"""
    goals = goal_service.list_goals(db, user_id)
    return [_serialize_goal(goal) for goal in goals]


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, goal: GoalUpdate, db: Session = Depends(get_db)):
    """Update a financial goal"""
    try:
        updated = goal_service.update_goal(db, goal_id, goal)
        return _serialize_goal(updated)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, db: Session = Depends(get_db)):
    """Delete a financial goal"""
    try:
        goal_service.delete_goal(db, goal_id)
        return {"message": "Goal deleted successfully"}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
