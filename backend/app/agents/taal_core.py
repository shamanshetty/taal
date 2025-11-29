"""
TaalCore Agent - Central orchestrator for financial intelligence
"""
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    # Fallback: use Python's built-in statistics module
    import statistics

from typing import List, Dict, Tuple
from datetime import datetime, timedelta

class TaalCoreAgent:
    """
    Central brain that manages income rhythm analysis and financial pulse scoring
    """

    def __init__(self):
        self.volatility_threshold = 0.3  # 30% volatility threshold

    def analyze_income_rhythm(
        self,
        income_data: List[Dict]
    ) -> Dict:
        """
        Analyze income patterns and calculate rhythm metrics

        Args:
            income_data: List of income transactions with amounts and dates

        Returns:
            Dictionary with rhythm analysis
        """
        if not income_data:
            return {
                "pattern": "insufficient_data",
                "volatility": 0,
                "avg_income": 0,
                "trend": "stable"
            }

        amounts = [item['amount'] for item in income_data]
        dates = [datetime.fromisoformat(item['date']) if isinstance(item['date'], str) else item['date'] for item in income_data]

        if HAS_NUMPY:
            avg_income = np.mean(amounts)
            std_dev = np.std(amounts)
        else:
            avg_income = statistics.mean(amounts) if amounts else 0
            std_dev = statistics.stdev(amounts) if len(amounts) > 1 else 0

        volatility = std_dev / avg_income if avg_income > 0 else 0

        # Determine pattern
        if volatility < 0.1:
            pattern = "stable"
        elif volatility < self.volatility_threshold:
            pattern = "moderate"
        else:
            pattern = "volatile"

        # Calculate trend
        if len(amounts) >= 3:
            if HAS_NUMPY:
                recent_avg = np.mean(amounts[-3:])
            else:
                recent_avg = statistics.mean(amounts[-3:])
            overall_avg = avg_income
            if recent_avg > overall_avg * 1.1:
                trend = "up"
            elif recent_avg < overall_avg * 0.9:
                trend = "down"
            else:
                trend = "stable"
        else:
            trend = "stable"

        return {
            "pattern": pattern,
            "volatility": round(volatility, 3),
            "avg_income": round(avg_income, 2),
            "std_dev": round(std_dev, 2),
            "trend": trend,
            "data_points": len(amounts)
        }

    def calculate_financial_pulse(
        self,
        income_data: List[Dict],
        expense_data: List[Dict]
    ) -> Tuple[int, Dict]:
        """
        Calculate the financial pulse score (0-100)

        Args:
            income_data: List of income transactions
            expense_data: List of expense transactions

        Returns:
            Tuple of (pulse_score, detailed_metrics)
        """
        if not income_data:
            return 0, {"error": "No income data"}

        income_amounts = [item['amount'] for item in income_data]
        expense_amounts = [item['amount'] for item in expense_data] if expense_data else [0]

        if HAS_NUMPY:
            avg_income = np.mean(income_amounts)
            avg_expense = np.mean(expense_amounts)
        else:
            avg_income = statistics.mean(income_amounts) if income_amounts else 0
            avg_expense = statistics.mean(expense_amounts) if expense_amounts else 0

        # Calculate savings rate
        savings_rate = ((avg_income - avg_expense) / avg_income * 100) if avg_income > 0 else 0
        savings_rate = max(0, min(100, savings_rate))  # Clamp between 0-100

        # Calculate income stability
        if HAS_NUMPY:
            std_dev = np.std(income_amounts)
        else:
            std_dev = statistics.stdev(income_amounts) if len(income_amounts) > 1 else 0
        volatility = std_dev / avg_income if avg_income > 0 else 1
        stability_score = max(0, 100 - (volatility * 100))

        # Calculate expense consistency
        if len(expense_amounts) > 1:
            if HAS_NUMPY:
                expense_volatility = np.std(expense_amounts) / np.mean(expense_amounts)
            else:
                expense_mean = statistics.mean(expense_amounts)
                expense_volatility = statistics.stdev(expense_amounts) / expense_mean if expense_mean > 0 else 0
            expense_consistency = max(0, 100 - (expense_volatility * 100))
        else:
            expense_consistency = 50

        # Weighted pulse score
        pulse_score = int(
            stability_score * 0.4 +
            savings_rate * 0.4 +
            expense_consistency * 0.2
        )

        # Determine trend
        if len(income_amounts) >= 3:
            if HAS_NUMPY:
                recent_avg = np.mean(income_amounts[-3:])
            else:
                recent_avg = statistics.mean(income_amounts[-3:])
            if recent_avg > avg_income * 1.05:
                trend = "up"
            elif recent_avg < avg_income * 0.95:
                trend = "down"
            else:
                trend = "stable"
        else:
            trend = "stable"

        metrics = {
            "score": pulse_score,
            "trend": trend,
            "volatility": round(volatility, 3),
            "savings_rate": round(savings_rate, 2),
            "stability_score": round(stability_score, 2),
            "avg_income": round(avg_income, 2),
            "avg_expense": round(avg_expense, 2)
        }

        return pulse_score, metrics

    def suggest_savings_goal(
        self,
        income_rhythm: Dict,
        current_savings: float,
        time_horizon_months: int = 6
    ) -> Dict:
        """
        Suggest adaptive savings goals based on income rhythm

        Args:
            income_rhythm: Output from analyze_income_rhythm
            current_savings: Current savings amount
            time_horizon_months: Planning horizon in months

        Returns:
            Suggested savings plan
        """
        avg_income = income_rhythm.get('avg_income', 0)
        volatility = income_rhythm.get('volatility', 0)

        # Adjust savings percentage based on volatility
        if volatility < 0.1:
            suggested_rate = 0.30  # 30% for stable income
        elif volatility < 0.3:
            suggested_rate = 0.25  # 25% for moderate volatility
        else:
            suggested_rate = 0.20  # 20% for high volatility

        monthly_savings = avg_income * suggested_rate
        target_savings = current_savings + (monthly_savings * time_horizon_months)

        return {
            "suggested_monthly_savings": round(monthly_savings, 2),
            "target_savings": round(target_savings, 2),
            "savings_rate": round(suggested_rate * 100, 1),
            "time_horizon_months": time_horizon_months,
            "confidence": "high" if volatility < 0.2 else "medium" if volatility < 0.4 else "low"
        }

    def generate_insights(self, pulse_metrics: Dict) -> List[str]:
        """
        Generate actionable insights based on financial pulse
        """
        insights = []

        score = pulse_metrics.get('score', 0)
        volatility = pulse_metrics.get('volatility', 0)
        savings_rate = pulse_metrics.get('savings_rate', 0)

        # Score-based insights
        if score >= 80:
            insights.append("🎉 Excellent financial health! Keep up the great work.")
        elif score >= 60:
            insights.append("👍 Good financial position. Small improvements can take you further.")
        elif score >= 40:
            insights.append("⚠️ Moderate financial health. Focus on increasing savings.")
        else:
            insights.append("🚨 Attention needed. Let's work on stabilizing your finances.")

        # Volatility insights
        if volatility > 0.4:
            insights.append("💡 Your income fluctuates significantly. Build a 3-month emergency fund.")

        # Savings rate insights
        if savings_rate < 10:
            insights.append("💰 Try to save at least 10-15% of your income each month.")
        elif savings_rate > 40:
            insights.append("🌟 Outstanding savings rate! Consider investing for growth.")

        return insights
