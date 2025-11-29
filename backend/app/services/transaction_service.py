from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.db_models import Transaction
from app.models.schemas import TransactionCreate


def _to_decimal(value: float) -> Decimal:
    return Decimal(str(value))


def create_transaction(db: Session, user_id: str, payload: TransactionCreate) -> Transaction:
    transaction = Transaction(
        user_id=user_id,
        client_id=payload.client_id,
        type=payload.type,
        amount=_to_decimal(payload.amount),
        currency=payload.currency,
        category=payload.category,
        subcategory=payload.subcategory,
        description=payload.description,
        date=payload.date,
        scheduled_for=payload.scheduled_for,
        is_recurring=payload.is_recurring,
        recurrence_rule=payload.recurrence_rule,
        gst_eligible=payload.gst_eligible,
        gst_rate=_to_decimal(payload.gst_rate) if payload.gst_rate is not None else None,
        ledger_status=payload.ledger_status,
        requires_follow_up=payload.requires_follow_up,
        follow_up_reason=payload.follow_up_reason,
        has_receipt=payload.has_receipt,
        tags=payload.tags,
        notes=payload.notes,
        source=payload.source,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def list_transactions(
    db: Session,
    user_id: str,
    type_filter: Optional[str] = None,
    limit: int = 100,
) -> List[Transaction]:
    query = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(desc(Transaction.date))
    if type_filter:
        query = query.filter(Transaction.type == type_filter)
    return query.limit(limit).all()


def income_expense_series(
    db: Session,
    user_id: str,
    months: int = 3,
) -> Tuple[List[dict], List[dict]]:
    start_date = (datetime.utcnow() - timedelta(days=30 * months)).date()
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.date >= start_date)
        .order_by(Transaction.date.asc())
        .all()
    )

    income = [
        {"amount": float(t.amount), "date": t.date.isoformat()}
        for t in transactions
        if t.type == "income"
    ]
    expenses = [
        {"amount": float(t.amount), "date": t.date.isoformat()}
        for t in transactions
        if t.type == "expense"
    ]
    return income, expenses
