"""
Predictor Agent - What-If scenario simulator
Uses lightweight ML for forecasting (optional)
"""
try:
    import numpy as np
    from sklearn.linear_model import LinearRegression
    HAS_ML = True
except ImportError:
    HAS_ML = False
    # Fallback: use simple Python calculations
    import statistics

from typing import Dict, List, Tuple
from datetime import datetime, timedelta

class PredictorAgent:
    """
    Simulates financial scenarios and predicts impact on goals
    """

    def __init__(self):
        if HAS_ML:
            self.model = LinearRegression()
        else:
            self.model = None  # Will use simple calculations

    def simulate_purchase_impact(
        self,
        purchase_amount: float,
        current_savings: float,
        monthly_income: float,
        monthly_expense: float,
        goals: List[Dict]
    ) -> Dict:
        """
        Simulate impact of a purchase on financial health and goals

        Args:
            purchase_amount: Amount of proposed purchase
            current_savings: Current savings
            monthly_income: Average monthly income
            monthly_expense: Average monthly expense
            goals: List of financial goals

        Returns:
            Impact analysis with recommendations
        """
        # Calculate current monthly surplus
        monthly_surplus = monthly_income - monthly_expense

        # Impact on savings
        new_savings = current_savings - purchase_amount
        savings_reduction = purchase_amount

        # Calculate affordability score (0-100)
        if purchase_amount <= monthly_surplus:
            affordability = 100
        elif purchase_amount <= current_savings:
            affordability = max(0, 100 - (purchase_amount / current_savings * 50))
        else:
            affordability = 0

        # Calculate recovery time (months to rebuild savings)
        if monthly_surplus > 0:
            recovery_months = purchase_amount / monthly_surplus
        else:
            recovery_months = float('inf')

        # Impact on goals
        goal_impacts = []
        for goal in goals:
            target = goal.get('target_amount', 0)
            current = goal.get('current_amount', 0)
            remaining = target - current

            # Calculate delay in achieving goal
            if monthly_surplus > 0:
                original_months = remaining / monthly_surplus
                new_months = (remaining + purchase_amount) / monthly_surplus
                delay_months = new_months - original_months
            else:
                delay_months = float('inf')

            goal_impacts.append({
                'goal_name': goal.get('title', 'Untitled Goal'),
                'delay_months': round(delay_months, 1) if delay_months != float('inf') else None,
                'delay_days': round(delay_months * 30, 0) if delay_months != float('inf') else None,
                'original_completion': round(original_months, 1) if original_months != float('inf') else None,
                'new_completion': round(new_months, 1) if new_months != float('inf') else None
            })

        # Generate recommendation
        if affordability >= 80:
            recommendation = "✅ This purchase looks affordable! You can go ahead without major impact."
        elif affordability >= 60:
            recommendation = "⚠️ This will impact your savings, but it's manageable if needed."
        elif affordability >= 40:
            recommendation = "🤔 Consider waiting or looking for a cheaper alternative."
        else:
            recommendation = "🚫 This purchase would significantly strain your finances. Better to wait."

        return {
            'affordability_score': round(affordability, 1),
            'savings_reduction': round(savings_reduction, 2),
            'new_savings': round(new_savings, 2),
            'recovery_months': round(recovery_months, 1) if recovery_months != float('inf') else None,
            'goal_impacts': goal_impacts,
            'recommendation': recommendation,
            'monthly_surplus': round(monthly_surplus, 2)
        }

    def forecast_income(
        self,
        historical_income: List[Dict],
        months_ahead: int = 3
    ) -> List[Dict]:
        """
        Forecast future income based on historical data

        Args:
            historical_income: List of income transactions with dates and amounts
            months_ahead: Number of months to forecast

        Returns:
            Forecasted income for next N months
        """
        if len(historical_income) < 3:
            # Not enough data for ML, use simple average
            if HAS_ML:
                avg_income = np.mean([item['amount'] for item in historical_income]) if historical_income else 0
            else:
                avg_income = statistics.mean([item['amount'] for item in historical_income]) if historical_income else 0

            forecasts = []
            for i in range(1, months_ahead + 1):
                forecast_date = datetime.now() + timedelta(days=30 * i)
                forecasts.append({
                    'month': forecast_date.strftime('%b %Y'),
                    'predicted_amount': round(avg_income, 2),
                    'confidence': 'low'
                })
            return forecasts

        # Prepare data
        dates = [datetime.fromisoformat(item['date']) if isinstance(item['date'], str) else item['date'] for item in historical_income]
        amounts = [item['amount'] for item in historical_income]

        if HAS_ML:
            # Use ML model for better predictions
            base_date = min(dates)
            X = np.array([(d - base_date).days for d in dates]).reshape(-1, 1)
            y = np.array(amounts)
            self.model.fit(X, y)
        else:
            # Simple average-based forecasting
            base_date = min(dates)

        # Generate forecasts
        forecasts = []
        last_date = max(dates)

        for i in range(1, months_ahead + 1):
            forecast_date = last_date + timedelta(days=30 * i)

            if HAS_ML:
                days_from_base = (forecast_date - base_date).days
                predicted = self.model.predict([[days_from_base]])[0]
                predicted = max(0, predicted)

                # Calculate confidence based on R² score
                r2_score = self.model.score(X, y) if len(X) > 1 else 0
                if r2_score > 0.7:
                    confidence = 'high'
                elif r2_score > 0.4:
                    confidence = 'medium'
                else:
                    confidence = 'low'
            else:
                # Simple average with trend
                avg_income = statistics.mean(amounts)
                # Simple trend: recent vs older
                if len(amounts) >= 4:
                    recent = statistics.mean(amounts[-2:])
                    older = statistics.mean(amounts[:2])
                    trend = (recent - older) / older if older > 0 else 0
                    predicted = avg_income * (1 + trend * i * 0.1)
                else:
                    predicted = avg_income

                predicted = max(0, predicted)
                confidence = 'medium'

            forecasts.append({
                'month': forecast_date.strftime('%b %Y'),
                'predicted_amount': round(predicted, 2),
                'confidence': confidence
            })

        return forecasts

    def calculate_emergency_fund_need(
        self,
        monthly_expense: float,
        income_volatility: float,
        dependents: int = 0
    ) -> Dict:
        """
        Calculate recommended emergency fund size

        Args:
            monthly_expense: Average monthly expenses
            income_volatility: Volatility of income (0-1)
            dependents: Number of dependents

        Returns:
            Emergency fund recommendation
        """
        # Base: 3-6 months of expenses
        if income_volatility < 0.1:
            base_months = 3
        elif income_volatility < 0.3:
            base_months = 4
        else:
            base_months = 6

        # Adjust for dependents
        dependent_months = dependents * 0.5

        recommended_months = base_months + dependent_months
        recommended_amount = monthly_expense * recommended_months

        return {
            'recommended_amount': round(recommended_amount, 2),
            'months_covered': round(recommended_months, 1),
            'reason': self._get_emergency_fund_reason(income_volatility, dependents)
        }

    def _get_emergency_fund_reason(self, volatility: float, dependents: int) -> str:
        """Generate explanation for emergency fund recommendation"""
        reasons = []

        if volatility > 0.3:
            reasons.append("your income is highly variable")
        elif volatility > 0.1:
            reasons.append("your income has moderate fluctuations")
        else:
            reasons.append("you have stable income")

        if dependents > 0:
            reasons.append(f"you have {dependents} dependent(s)")

        return f"Based on {' and '.join(reasons)}, we recommend this emergency fund size."

    def generate_savings_trajectory(
        self,
        current_savings: float,
        monthly_savings: float,
        months: int = 12,
        with_purchase: float = 0
    ) -> List[Dict]:
        """
        Generate savings trajectory over time

        Args:
            current_savings: Current savings amount
            monthly_savings: Monthly savings amount
            months: Number of months to project
            with_purchase: One-time purchase amount (optional)

        Returns:
            List of monthly savings projections
        """
        trajectory = []
        balance = current_savings

        for month in range(months + 1):
            # Apply purchase in month 0
            if month == 0 and with_purchase > 0:
                balance -= with_purchase

            trajectory.append({
                'month': month,
                'balance': round(balance, 2),
                'month_label': f'Month {month}'
            })

            # Add monthly savings
            if month < months:
                balance += monthly_savings

        return trajectory
