from fastapi import APIRouter, Request, Form
from app.services.whatsapp_bot import whatsapp_bot

router = APIRouter()

@router.post("/webhook")
async def whatsapp_webhook(
    From: str = Form(...),
    Body: str = Form(...),
):
    """
    Webhook endpoint for incoming WhatsApp messages
    """
    # TODO: Fetch user data from database based on phone number
    user_data = {
        "pulse_score": 75,
        "avg_income": 50000,
        "savings_rate": 25.0,
        "trend": "up"
    }

    response = whatsapp_bot.handle_incoming_message(
        from_number=From,
        message_body=Body,
        user_data=user_data
    )

    # Send response back
    whatsapp_bot.send_message(From, response)

    return {"status": "success"}

@router.post("/send-nudge")
async def send_daily_nudge(user_id: str, phone_number: str):
    """
    Send daily nudge to a user
    """
    # TODO: Fetch user data from database
    user_data = {
        "pulse_score": 75,
        "avg_income": 50000,
        "savings_rate": 25.0,
        "trend": "up"
    }

    result = whatsapp_bot.send_daily_nudge(phone_number, user_data)

    return result
