"""
WhatsApp Bot service using Twilio
Sends daily nudges and responds to user queries
"""
from twilio.rest import Client
from typing import Optional
from app.config import settings
from app.agents.coach_agent import CoachAgent

class WhatsAppBot:
    """
    WhatsApp bot for sending financial nudges and advice
    """

    def __init__(self):
        if settings.twilio_account_sid and settings.twilio_auth_token:
            self.client = Client(
                settings.twilio_account_sid,
                settings.twilio_auth_token
            )
            self.from_number = settings.twilio_whatsapp_number
        else:
            self.client = None
            self.from_number = None

        self.coach = CoachAgent()

    def send_message(
        self,
        to_number: str,
        message: str
    ) -> dict:
        """
        Send a WhatsApp message to a user

        Args:
            to_number: User's WhatsApp number (format: whatsapp:+919876543210)
            message: Message content

        Returns:
            Message delivery status
        """
        if not self.client:
            return {
                "status": "error",
                "message": "Twilio not configured"
            }

        try:
            # Ensure number has whatsapp: prefix
            if not to_number.startswith('whatsapp:'):
                to_number = f'whatsapp:{to_number}'

            msg = self.client.messages.create(
                from_=self.from_number,
                body=message,
                to=to_number
            )

            return {
                "status": "success",
                "message_sid": msg.sid,
                "to": to_number
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

    def send_daily_nudge(
        self,
        to_number: str,
        user_data: dict
    ) -> dict:
        """
        Send personalized daily financial nudge

        Args:
            to_number: User's WhatsApp number
            user_data: User's financial data

        Returns:
            Message delivery status
        """
        nudge = self.coach.generate_daily_nudge(user_data)

        return self.send_message(to_number, nudge)

    def send_spending_alert(
        self,
        to_number: str,
        amount: float,
        category: str
    ) -> dict:
        """
        Send spending alert

        Args:
            to_number: User's WhatsApp number
            amount: Spending amount
            category: Spending category

        Returns:
            Message delivery status
        """
        message = f"""💰 Spending Alert!

You just spent ₹{amount:,.0f} on {category}.

Track your expenses regularly to stay on top of your finances!

- TaalAI"""

        return self.send_message(to_number, message)

    def send_goal_milestone(
        self,
        to_number: str,
        goal_name: str,
        progress: int
    ) -> dict:
        """
        Send goal milestone notification

        Args:
            to_number: User's WhatsApp number
            goal_name: Name of the goal
            progress: Progress percentage

        Returns:
            Message delivery status
        """
        message = f"""🎉 Milestone Alert!

You've reached {progress}% of your "{goal_name}" goal!

Keep going! You're doing great! 💪

- TaalAI"""

        return self.send_message(to_number, message)

    def send_tax_reminder(
        self,
        to_number: str,
        quarter: str,
        amount: float,
        due_date: str
    ) -> dict:
        """
        Send tax payment reminder

        Args:
            to_number: User's WhatsApp number
            quarter: Tax quarter (Q1, Q2, Q3, Q4)
            amount: Estimated tax amount
            due_date: Payment due date

        Returns:
            Message delivery status
        """
        message = f"""📅 Tax Reminder!

{quarter} advance tax payment is due on {due_date}.

Estimated amount: ₹{amount:,.0f}

Don't forget to pay on time to avoid penalties!

- TaalAI"""

        return self.send_message(to_number, message)

    def handle_incoming_message(
        self,
        from_number: str,
        message_body: str,
        user_data: Optional[dict] = None
    ) -> str:
        """
        Handle incoming WhatsApp message from user

        Args:
            from_number: User's WhatsApp number
            message_body: Message content
            user_data: User's financial data (optional)

        Returns:
            Response message
        """
        # Use coach agent to generate contextual response
        context = user_data if user_data else {}

        response = self.coach.generate_advice(
            user_message=message_body,
            context=context,
            language='hinglish'
        )

        return response

# Initialize bot instance
whatsapp_bot = WhatsAppBot()
