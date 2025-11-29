from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import WhatIfRequest, WhatIfResponse
from app.agents.predictor_agent import PredictorAgent

router = APIRouter()
predictor = PredictorAgent()

@router.post("/what-if", response_model=WhatIfResponse)
async def simulate_what_if(request: WhatIfRequest, user_id: str = Query(...)):
    """Simulate 'what if I buy this?' scenario"""
    try:
        # TODO: Fetch real user data from database
        current_savings = 100000
        monthly_income = 50000
        monthly_expense = 30000
        goals = [
            {
                "title": "Emergency Fund",
                "target_amount": 150000,
                "current_amount": 50000
            },
            {
                "title": "New Laptop",
                "target_amount": 80000,
                "current_amount": 30000
            }
        ]

        impact = predictor.simulate_purchase_impact(
            purchase_amount=request.purchase_amount,
            current_savings=current_savings,
            monthly_income=monthly_income,
            monthly_expense=monthly_expense,
            goals=goals
        )

        # Generate savings trajectory chart data
        monthly_surplus = monthly_income - monthly_expense
        chart_data_without = predictor.generate_savings_trajectory(
            current_savings=current_savings,
            monthly_savings=monthly_surplus,
            months=12
        )
        chart_data_with = predictor.generate_savings_trajectory(
            current_savings=current_savings,
            monthly_savings=monthly_surplus,
            months=12,
            with_purchase=request.purchase_amount
        )

        # Combine for comparison
        chart_data = []
        for i in range(len(chart_data_without)):
            chart_data.append({
                "month": chart_data_without[i]['month'],
                "without_purchase": chart_data_without[i]['balance'],
                "with_purchase": chart_data_with[i]['balance']
            })

        return {
            "purchase_amount": request.purchase_amount,
            "purchase_description": request.purchase_description,
            "impact": impact,
            "recommendation": impact['recommendation'],
            "chart_data": chart_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast-income")
async def forecast_income(user_id: str = Query(...), months: int = Query(3, le=12)):
    """Forecast future income"""
    # TODO: Fetch historical income from database
    historical_income = [
        {"date": "2024-01-15", "amount": 50000},
        {"date": "2024-02-15", "amount": 45000},
        {"date": "2024-03-15", "amount": 55000},
    ]

    forecast = predictor.forecast_income(historical_income, months)

    return {
        "forecast": forecast,
        "historical_months": len(historical_income)
    }
