from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.agents.taal_core import TaalCoreAgent
from app.db import get_db
from app.models.db_models import Transaction
from app.models.schemas import FinancialPulseResponse, TransactionCreate, TransactionResponse
from app.services import transaction_service

router = APIRouter()
taal_core = TaalCoreAgent()


def _serialize_transaction(txn: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=str(txn.id),
        user_id=str(txn.user_id),
        type=txn.type,
        amount=float(txn.amount),
        currency=txn.currency,
        category=txn.category,
        subcategory=txn.subcategory,
        description=txn.description,
        date=txn.date,
        client_id=str(txn.client_id) if txn.client_id else None,
        scheduled_for=txn.scheduled_for,
        is_recurring=txn.is_recurring,
        recurrence_rule=txn.recurrence_rule,
        gst_eligible=txn.gst_eligible,
        gst_rate=float(txn.gst_rate) if txn.gst_rate is not None else None,
        ledger_status=txn.ledger_status,
        requires_follow_up=txn.requires_follow_up,
        follow_up_reason=txn.follow_up_reason,
        has_receipt=txn.has_receipt,
        tags=txn.tags,
        notes=txn.notes,
        source=txn.source,
        created_at=txn.created_at,
        updated_at=txn.updated_at,
    )


@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    transaction: TransactionCreate,
    user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    db_transaction = transaction_service.create_transaction(db, user_id, transaction)
    return _serialize_transaction(db_transaction)


@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    user_id: str = Query(...),
    type: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
):
    transactions = transaction_service.list_transactions(db, user_id, type_filter=type, limit=limit)
    return [_serialize_transaction(t) for t in transactions]


@router.get("/pulse", response_model=FinancialPulseResponse)
async def get_financial_pulse(user_id: str = Query(...), db: Session = Depends(get_db)):
    income_data, expense_data = transaction_service.income_expense_series(db, user_id)

    if not income_data and not expense_data:
        return FinancialPulseResponse(
            score=50,
            trend="stable",
            volatility=0,
            savings_rate=0,
            insights=["Add income and expense data to begin tracking your financial pulse."],
        )

    pulse_score, metrics = taal_core.calculate_financial_pulse(income_data, expense_data)
    insights = taal_core.generate_insights(metrics)

    return FinancialPulseResponse(
        score=pulse_score,
        trend=metrics["trend"],
        volatility=metrics["volatility"],
        savings_rate=metrics["savings_rate"],
        insights=insights,
    )
