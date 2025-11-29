from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.agents.coach_agent import CoachAgent
from app.agents.langgraph_router import invoke_chat, schedule_memory_persist
from app.db import get_db
from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter()
coach = CoachAgent()


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Send a message to the AI coach via LangGraph."""
    try:
        response_text, final_messages = invoke_chat(
            request.message,
            request.history,
            user_id=user_id,
            db=db,
        )
        schedule_memory_persist(background_tasks, user_id, final_messages)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    audio_url = None
    if request.use_voice:
        # Placeholder for future TTS integration.
        pass

    return {
        "response": response_text,
        "audio_url": audio_url,
        "timestamp": datetime.now(),
    }

@router.get("/daily-nudge")
async def get_daily_nudge(user_id: str = Query(...)):
    """Get daily financial nudge"""
    # TODO: Fetch user data from database
    user_data = {
        "pulse_score": 75,
        "avg_income": 50000,
        "savings_rate": 25.0,
        "trend": "up"
    }

    nudge = coach.generate_daily_nudge(user_data)

    return {
        "nudge": nudge,
        "timestamp": datetime.now()
    }
