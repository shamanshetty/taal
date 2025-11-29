"""
Tax Agent - Tax insights and filing guidance
Handles TDS, GST, and advance tax for Indian freelancers
"""
from typing import Dict, List, Tuple
from datetime import datetime
import calendar

class TaxAgent:
    """
    Provides tax insights and categorization for Indian tax system
    """

    def __init__(self):
        # FY 2024-25 tax slabs (new regime)
        self.tax_slabs = [
            (300000, 0),      # Up to 3L: 0%
            (700000, 0.05),   # 3L-7L: 5%
            (1000000, 0.10),  # 7L-10L: 10%
            (1200000, 0.15),  # 10L-12L: 15%
            (1500000, 0.20),  # 12L-15L: 20%
            (float('inf'), 0.30)  # Above 15L: 30%
        ]

        # Standard deduction
        self.standard_deduction = 50000

        # TDS rates for common categories
        self.tds_rates = {
            'professional_fees': 0.10,  # 194J
            'freelance': 0.10,
            'contract': 0.02,  # 194C
            'rent': 0.10,  # 194I
        }

    def estimate_quarterly_tax(
        self,
        income_data: List[Dict],
        expense_data: List[Dict],
        current_quarter: str
    ) -> Dict:
        """
        Estimate tax liability for the current quarter

        Args:
            income_data: List of income transactions
            expense_data: List of expense transactions (business expenses)
            current_quarter: Quarter string (e.g., "Q1", "Q2")

        Returns:
            Tax estimate with breakdown
        """
        # Calculate total income
        total_income = sum(item['amount'] for item in income_data)

        # Calculate deductible expenses
        business_expenses = self._categorize_expenses(expense_data)
        total_deductible = sum(business_expenses.values())

        # Calculate taxable income
        gross_income = total_income - total_deductible - self.standard_deduction
        taxable_income = max(0, gross_income)

        # Calculate tax
        tax_amount = self._calculate_tax(taxable_income)

        # Adjust for advance tax (quarterly)
        quarter_percentages = {
            'Q1': 0.15,  # 15% by June 15
            'Q2': 0.30,  # 45% by Sep 15 (cumulative)
            'Q3': 0.45,  # 75% by Dec 15 (cumulative)
            'Q4': 0.25   # 100% by Mar 15 (cumulative)
        }

        quarter_percentage = quarter_percentages.get(current_quarter, 0.25)
        quarterly_tax = tax_amount * quarter_percentage

        return {
            'estimated_annual_tax': round(tax_amount, 2),
            'quarterly_tax': round(quarterly_tax, 2),
            'quarter': current_quarter,
            'breakdown': {
                'total_income': round(total_income, 2),
                'business_expenses': round(total_deductible, 2),
                'standard_deduction': self.standard_deduction,
                'taxable_income': round(taxable_income, 2),
                'effective_tax_rate': round((tax_amount / total_income * 100), 2) if total_income > 0 else 0
            },
            'expense_categories': {k: round(v, 2) for k, v in business_expenses.items()}
        }

    def _calculate_tax(self, taxable_income: float) -> float:
        """Calculate income tax based on slabs"""
        if taxable_income <= 0:
            return 0

        tax = 0
        prev_slab = 0

        for slab_limit, rate in self.tax_slabs:
            if taxable_income > prev_slab:
                taxable_in_slab = min(taxable_income, slab_limit) - prev_slab
                tax += taxable_in_slab * rate
                prev_slab = slab_limit
            else:
                break

        # Add 4% cess
        tax_with_cess = tax * 1.04

        return tax_with_cess

    def _categorize_expenses(self, expenses: List[Dict]) -> Dict[str, float]:
        """Categorize expenses into tax-deductible categories"""
        categories = {
            'office_rent': 0,
            'equipment': 0,
            'internet_phone': 0,
            'travel': 0,
            'professional_development': 0,
            'software_subscriptions': 0,
            'other': 0
        }

        for expense in expenses:
            category = expense.get('category', '').lower()
            amount = expense.get('amount', 0)

            if 'rent' in category:
                categories['office_rent'] += amount
            elif any(word in category for word in ['laptop', 'computer', 'equipment', 'hardware']):
                categories['equipment'] += amount
            elif any(word in category for word in ['internet', 'phone', 'mobile']):
                categories['internet_phone'] += amount
            elif 'travel' in category or 'transport' in category:
                categories['travel'] += amount
            elif any(word in category for word in ['course', 'training', 'book', 'learning']):
                categories['professional_development'] += amount
            elif 'software' in category or 'subscription' in category or 'saas' in category:
                categories['software_subscriptions'] += amount
            else:
                categories['other'] += amount

        return categories

    def calculate_tds_on_income(
        self,
        income_type: str,
        amount: float
    ) -> Dict:
        """
        Calculate TDS that should be deducted on income

        Args:
            income_type: Type of income (professional_fees, freelance, etc.)
            amount: Income amount

        Returns:
            TDS details
        """
        tds_rate = self.tds_rates.get(income_type.lower(), 0.10)
        tds_amount = amount * tds_rate

        return {
            'income_type': income_type,
            'income_amount': round(amount, 2),
            'tds_rate': tds_rate * 100,
            'tds_amount': round(tds_amount, 2),
            'net_amount': round(amount - tds_amount, 2)
        }

    def check_gst_requirement(
        self,
        annual_turnover: float
    ) -> Dict:
        """
        Check if GST registration is required

        Args:
            annual_turnover: Annual business turnover

        Returns:
            GST requirement status
        """
        gst_threshold = 2000000  # 20 lakhs for services

        is_required = annual_turnover >= gst_threshold
        buffer = gst_threshold - annual_turnover

        if is_required:
            status = "required"
            message = f"GST registration is mandatory as your turnover (₹{annual_turnover:,.0f}) exceeds ₹20 lakhs."
        elif buffer <= 500000:  # Within 5 lakhs of threshold
            status = "approaching"
            message = f"You're ₹{buffer:,.0f} away from GST threshold. Consider registering voluntarily."
        else:
            status = "not_required"
            message = f"GST registration not required yet. You're ₹{buffer:,.0f} below the threshold."

        return {
            'status': status,
            'is_required': is_required,
            'threshold': gst_threshold,
            'current_turnover': round(annual_turnover, 2),
            'buffer': round(buffer, 2) if buffer > 0 else 0,
            'message': message
        }

    def generate_tax_suggestions(
        self,
        tax_data: Dict,
        income_data: List[Dict]
    ) -> List[str]:
        """
        Generate actionable tax-saving suggestions

        Args:
            tax_data: Tax estimate data
            income_data: Income transactions

        Returns:
            List of suggestions
        """
        suggestions = []

        taxable_income = tax_data.get('breakdown', {}).get('taxable_income', 0)
        business_expenses = tax_data.get('breakdown', {}).get('business_expenses', 0)
        total_income = tax_data.get('breakdown', {}).get('total_income', 0)

        # Expense tracking suggestion
        if business_expenses < total_income * 0.1:
            suggestions.append(
                "💡 Track business expenses carefully! Even 10-15% of income as valid business "
                "expenses can significantly reduce tax."
            )

        # 80C suggestion
        if taxable_income > 300000:
            suggestions.append(
                "💰 Consider investing in 80C instruments (PPF, ELSS, etc.) to save up to ₹46,800 in taxes."
            )

        # Health insurance suggestion
        suggestions.append(
            "🏥 Health insurance premiums (80D) can give you deduction up to ₹25,000 (₹50,000 if 60+)."
            )

        # Advance tax reminder
        quarterly_tax = tax_data.get('quarterly_tax', 0)
        if quarterly_tax > 10000:
            suggestions.append(
                f"📅 Don't forget to pay advance tax of ₹{quarterly_tax:,.0f} for {tax_data.get('quarter', 'this quarter')} "
                "to avoid interest penalties."
            )

        # Record keeping
        suggestions.append(
            "📝 Maintain digital copies of all invoices and receipts. Use apps to scan and store them."
        )

        return suggestions

    def get_current_quarter(self) -> str:
        """Get current financial year quarter"""
        now = datetime.now()
        month = now.month

        # Financial year in India: April to March
        if 4 <= month <= 6:
            return 'Q1'
        elif 7 <= month <= 9:
            return 'Q2'
        elif 10 <= month <= 12:
            return 'Q3'
        else:  # Jan-Mar
            return 'Q4'
