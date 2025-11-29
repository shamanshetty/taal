"""
Coach Agent - AI-powered conversational financial coach
Uses Gemini API for personalized advice
"""
import google.generativeai as genai
from typing import Dict, List, Optional

from app.config import settings


class CoachAgent:
    """
    AI coach that provides personalized financial advice in Hinglish
    """

    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)

        self.model_candidates = self._build_model_candidates()
        if not self.model_candidates:
            raise RuntimeError(
                "No Gemini models configured. Set GEMINI_MODEL in your backend .env file."
            )

        self._model_index = 0
        initial_model_name = self.model_candidates[self._model_index]
        try:
            self.model = genai.GenerativeModel(initial_model_name)
            self.active_model_name = initial_model_name
        except Exception as exc:
            raise RuntimeError(
                f"Unable to initialize Gemini model '{initial_model_name}'. "
                "Check your GEMINI_API_KEY and GEMINI_MODEL environment variables."
            ) from exc

        self.system_prompt = (
            "You are TaalAI, a culturally-aware financial coach built for Indians with irregular incomes "
            "(freelancers, creators, consultants).\n\n"
            "Core promise:\n"
            "- Help users stabilise lumpy cash flows, stay tax compliant, and move goals forward without overwhelm.\n"
            "- Reference live context (pulse score, averages, volatility, recent behaviour) so every reply feels personal.\n\n"
            "Tone & voice:\n"
            "- Warm, candid, collaborative; use Hinglish lightly when it adds comfort, otherwise clear Indian English.\n"
            "- Keep answers compact (2-4 sentences) and outcome-oriented. One emoji is fine if it adds warmth.\n"
            "- Jump straight into insight; only greet when it adds value.\n\n"
            "Knowledge foundations:\n"
            "- Indian cash-flow habits, emergency funds, tax (advance tax, TDS/GST basics), goal-based saving, credit readiness, behavioural nudges.\n"
            "- Typical creator/consultant rhythms: sporadic payouts, invoice delays, client retainers, platform fees.\n\n"
            "How to respond:\n"
            "- Start by anchoring to the user's situation (quote their ask, cite their numbers, mention volatility or runway).\n"
            "- Offer a specific next step with amounts, percentages, or timelines.\n"
            "- Suggest a follow-up action to keep momentum (e.g. review expenses, set an automation, draft a checklist).\n"
            "- Focus on habits and cash discipline, not specific investment products.\n\n"
            "Constraints:\n"
            "- Never fabricate portfolio advice or investment picks.\n"
            "- If information is missing, say what you need and offer a quick path forward.\n"
            "- Stay practical, empathetic, and rooted in the Indian context."
        )

    def _build_model_candidates(self) -> List[str]:
        """
        Build the ordered list of Gemini model candidates, removing duplicates.
        """
        raw_candidates = [
            settings.gemini_model,
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-001",
            "gemini-flash-latest",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.0-pro",
        ]

        candidates: List[str] = []
        seen = set()
        for candidate in raw_candidates:
            if candidate and candidate not in seen:
                candidates.append(candidate)
                seen.add(candidate)
        return candidates

    def _use_next_model(self) -> bool:
        """
        Switch to the next available Gemini model in the preference list.
        Returns True if a switch succeeded, False otherwise.
        """
        for next_index in range(self._model_index + 1, len(self.model_candidates)):
            next_model_name = self.model_candidates[next_index]
            try:
                self.model = genai.GenerativeModel(next_model_name)
                self._model_index = next_index
                self.active_model_name = next_model_name
                return True
            except Exception:
                continue
        return False

    def _generate_with_retry(self, prompt: str) -> str:
        """
        Generate Gemini content, falling back to alternative models on 404 errors.
        """
        attempts_remaining = len(self.model_candidates) - self._model_index
        last_error: Optional[Exception] = None

        for _ in range(max(1, attempts_remaining)):
            try:
                response = self.model.generate_content(prompt)
                return response.text.strip() if getattr(response, "text", None) else ""
            except Exception as exc:
                last_error = exc
                error_text = str(exc).lower()
                model_not_found = "404" in error_text or "not found" in error_text
                if model_not_found and self._use_next_model():
                    continue
                raise exc

        if last_error:
            raise last_error
        raise RuntimeError("Gemini generation failed without an error message.")

    def _format_error(self, error: Exception) -> str:
        """
        Provide a user-friendly error message with troubleshooting tips.
        """
        return (
            "Sorry, I'm having trouble right now. Please try again. "
            "Make sure your GEMINI_API_KEY is valid and, if needed, set GEMINI_MODEL "
            "to one of the models available on your Google AI Studio account. "
            f"Last error: {str(error)}"
        )

    def generate_advice(
        self,
        user_message: str,
        context: Optional[Dict] = None,
        language: str = "en"
    ) -> str:
        """
        Generate personalized financial advice

        Args:
            user_message: User's question or concern
            context: User's financial data for context
            language: Preferred language (en, hi, hinglish)

        Returns:
            AI-generated advice
        """
        # Build context string
        context_str = ""
        if context:
            if 'pulse_score' in context:
                context_str += f"\nUser's Financial Pulse: {context['pulse_score']}/100"
            if 'avg_income' in context:
                context_str += f"\nAverage Monthly Income: ,1{context['avg_income']:,.0f}"
            if 'avg_expense' in context:
                context_str += f"\nAverage Monthly Expense: ,1{context['avg_expense']:,.0f}"
            if 'volatility' in context:
                volatility_level = "high" if context['volatility'] > 0.3 else "moderate" if context['volatility'] > 0.1 else "low"
                context_str += f"\nIncome Volatility: {volatility_level}"

        # Language instruction
        language_instruction = ""
        if language == "hi":
            language_instruction = "\nRespond in Hindi (Devanagari script)."
        elif language == "hinglish":
            language_instruction = "\nRespond in Hinglish (mix Hindi words with English)."

        full_prompt = f"""{self.system_prompt}

{context_str}

User Question: {user_message}
{language_instruction}

Respond as TaalAI:"""

        try:
            return self._generate_with_retry(full_prompt)
        except Exception as e:
            return self._format_error(e)

    def generate_daily_nudge(
        self,
        user_data: Dict
    ) -> str:
        """
        Generate a daily financial nudge based on user's data

        Args:
            user_data: User's financial information

        Returns:
            Short motivational message
        """
        prompt = f"""{self.system_prompt}

User Financial Summary:
- Pulse Score: {user_data.get('pulse_score', 50)}/100
- Avg Income: ,1{user_data.get('avg_income', 0):,.0f}
- Savings Rate: {user_data.get('savings_rate', 0):.1f}%
- Recent Trend: {user_data.get('trend', 'stable')}

Generate a short (1-2 sentences), encouraging daily nudge that motivates the user to make a small positive financial decision today. Be specific and actionable.

Daily Nudge:"""

        try:
            return self._generate_with_retry(prompt)
        except Exception as e:
            return self._format_error(e)

    def explain_spending_pattern(
        self,
        spending_data: List[Dict]
    ) -> str:
        """
        Analyze and explain spending patterns

        Args:
            spending_data: List of expenses by category

        Returns:
            Natural language explanation
        """
        if not spending_data:
            return "I need more spending data to give you insights. Track your expenses for a few days!"

        # Summarize spending
        summary = "\n".join([
            f"- {item['category']}: ,1{item['amount']:,.0f}"
            for item in spending_data[:5]  # Top 5 categories
        ])

        prompt = f"""{self.system_prompt}

User's spending breakdown:
{summary}

Analyze this spending pattern and provide:
1. One key observation
2. One specific suggestion to optimize spending
3. One encouraging note

Keep it brief (3-4 sentences).

Analysis:"""

        try:
            return self._generate_with_retry(prompt)
        except Exception as e:
            return self._format_error(e)

    def create_goal_plan(
        self,
        goal_name: str,
        target_amount: float,
        current_savings: float,
        monthly_income: float
    ) -> str:
        """
        Create a personalized plan to achieve a financial goal

        Args:
            goal_name: Name of the goal
            target_amount: Target amount needed
            current_savings: Current savings
            monthly_income: Average monthly income

        Returns:
            Step-by-step plan
        """
        remaining = target_amount - current_savings

        prompt = f"""{self.system_prompt}

User wants to save for: {goal_name}
Target Amount: ,1{target_amount:,.0f}
Already Saved: ,1{current_savings:,.0f}
Remaining: ,1{remaining:,.0f}
Average Monthly Income: ,1{monthly_income:,.0f}

Create a practical, encouraging 3-step plan to help them achieve this goal. Consider their irregular income. Be specific with numbers and timelines.

Goal Plan:"""

        try:
            return self._generate_with_retry(prompt)
        except Exception as e:
            return self._format_error(e)
