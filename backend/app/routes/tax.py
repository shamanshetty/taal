from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import TaxInsightResponse
from app.agents.tax_agent import TaxAgent

router = APIRouter()
tax_agent = TaxAgent()

@router.get("/insights", response_model=TaxInsightResponse)
async def get_tax_insights(user_id: str = Query(...)):
    """Get tax insights and estimates"""
    try:
        # TODO: Fetch real data from database
        income_data = [
            {"amount": 50000, "date": "2024-01-15", "category": "freelance"},
            {"amount": 45000, "date": "2024-02-15", "category": "freelance"},
            {"amount": 55000, "date": "2024-03-15", "category": "professional_fees"},
        ]
        expense_data = [
            {"amount": 5000, "date": "2024-01-10", "category": "internet"},
            {"amount": 3000, "date": "2024-01-15", "category": "software subscription"},
            {"amount": 2000, "date": "2024-02-10", "category": "course"},
        ]

        current_quarter = tax_agent.get_current_quarter()

        tax_estimate = tax_agent.estimate_quarterly_tax(
            income_data=income_data,
            expense_data=expense_data,
            current_quarter=current_quarter
        )

        suggestions = tax_agent.generate_tax_suggestions(
            tax_data=tax_estimate,
            income_data=income_data
        )

        return {
            "estimated_tax": tax_estimate['quarterly_tax'],
            "quarter": current_quarter,
            "breakdown": tax_estimate['breakdown'],
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gst-status")
async def check_gst_status(user_id: str = Query(...)):
    """Check GST registration requirement"""
    # TODO: Calculate actual annual turnover from database
    annual_turnover = 1800000  # Mock data

    gst_status = tax_agent.check_gst_requirement(annual_turnover)

    return gst_status

@router.post("/calculate-tds")
async def calculate_tds(income_type: str, amount: float):
    """Calculate TDS on income"""
    tds_details = tax_agent.calculate_tds_on_income(income_type, amount)

    return tds_details
