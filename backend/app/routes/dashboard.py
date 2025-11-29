from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.schemas import DashboardHighlightsResponse
from app.services import dashboard_service


router = APIRouter()


@router.get("/highlights", response_model=DashboardHighlightsResponse)
async def get_dashboard_highlights(user_id: str = Query(...), db: Session = Depends(get_db)):
    return dashboard_service.get_dashboard_highlights(db, user_id)
