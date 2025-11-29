from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.db_models import ComplianceTask, Invoice, Transaction


MAX_RECEIVABLES = 3
MAX_COMPLIANCE = 4
MAX_ACTIONS = 4
MAX_EVENTS = 6
UPCOMING_WINDOW_DAYS = 14


def _format_due_status(due_date: date | None, today: date) -> str:
    if due_date is None:
        return "No due date"
    delta = (due_date - today).days
    if delta > 0:
        return f"Due in {delta} day{'s' if delta != 1 else ''}"
    if delta == 0:
        return "Due today"
    return f"{abs(delta)} day{'s' if delta != 1 else ''} overdue"


def _relative_label(target: date | None, today: date) -> str:
    if target is None:
        return "No date"
    delta = (today - target).days
    if delta == 0:
        return "Today"
    if delta > 0:
        return f"{delta} day{'s' if delta != 1 else ''} ago"
    return f"In {abs(delta)} day{'s' if abs(delta) != 1 else ''}"


def _receivable_dict(invoice: Invoice, today: date) -> Dict:
    client_name = invoice.client.name if invoice.client else None
    title_parts = [part for part in [invoice.number, invoice.description, client_name] if part]
    title = title_parts[0] if title_parts else "Invoice"
    return {
        "id": str(invoice.id),
        "title": title,
        "client_name": client_name,
        "amount": float(invoice.amount),
        "currency": invoice.currency,
        "due_date": _date_to_iso(invoice.due_date),
        "status_label": _format_due_status(invoice.due_date, today) if invoice.due_date else invoice.status.title(),
    }


def _compliance_dict(task: ComplianceTask, today: date) -> Dict:
    return {
        "id": str(task.id),
        "title": task.title or f"{task.task_type or 'compliance'} task",
        "task_type": task.task_type,
        "due_date": _date_to_iso(task.due_date),
        "status": task.status,
        "notes": task.notes,
        "urgency_label": _format_due_status(task.due_date, today),
    }


def _transaction_action_dict(txn: Transaction, today: date) -> Dict:
    title = txn.description or txn.category or "Transaction follow-up"
    category = txn.follow_up_reason or ("Receipt missing" if not txn.has_receipt else txn.ledger_status.title())
    return {
        "id": str(txn.id),
        "title": title,
        "category": category,
        "urgency": _relative_label(txn.date, today),
        "kind": "transaction",
        "amount": float(txn.amount),
    }


def _invoice_action_dict(invoice: Dict, today: date) -> Dict:
    return {
        "id": f"invoice-{invoice['id']}",
        "title": invoice["title"],
        "category": "Invoice",
        "urgency": _format_due_status(invoice.get("due_date"), today),
        "kind": "invoice",
        "amount": invoice["amount"],
    }


def _compliance_action_dict(task: Dict) -> Dict:
    return {
        "id": f"task-{task['id']}",
        "title": task["title"],
        "category": (task.get("task_type") or "Compliance").title(),
        "urgency": task["urgency_label"],
        "kind": "compliance",
        "amount": None,
    }


def _build_action_inbox(
    today: date,
    followup_transactions: List[Transaction],
    compliance_tasks: List[Dict],
    receivables: List[Dict],
) -> List[Dict]:
    items: List[Dict] = []

    for txn in followup_transactions:
        items.append(_transaction_action_dict(txn, today))
        if len(items) >= MAX_ACTIONS:
            return items

    for task in compliance_tasks:
        items.append(_compliance_action_dict(task))
        if len(items) >= MAX_ACTIONS:
            return items

    for invoice in receivables:
        items.append(_invoice_action_dict(invoice, today))
        if len(items) >= MAX_ACTIONS:
            return items

    return items


def _build_upcoming_events(
    today: date,
    scheduled_transactions: List[Transaction],
    compliance_tasks: List[Dict],
    receivables: List[Dict],
) -> List[Dict]:
    events: List[Dict] = []

    for txn in scheduled_transactions:
        events.append(
            {
                "id": f"txn-{txn.id}",
                "title": txn.description or (txn.category or "Transaction"),
                "date": _date_to_iso(txn.scheduled_for),
                "amount": float(txn.amount),
                "currency": txn.currency,
                "type": "income" if txn.type == "income" else "outflow",
                "source": "transaction",
            }
        )

    for invoice in receivables:
        events.append(
            {
                "id": f"invoice-event-{invoice['id']}",
                "title": invoice["title"],
                "date": invoice.get("due_date"),
                "amount": invoice["amount"],
                "currency": invoice["currency"],
                "type": "inflow",
                "source": "invoice",
            }
        )

    for task in compliance_tasks:
        events.append(
            {
                "id": f"task-event-{task['id']}",
                "title": task["title"],
                "date": task.get("due_date"),
                "amount": None,
                "currency": None,
                "type": "task",
                "source": "compliance",
            }
        )

    events.sort(key=lambda event: (event["date"] or (today + timedelta(days=365))))
    return events[:MAX_EVENTS]


def get_dashboard_highlights(db: Session, user_id: str) -> Dict:
    today = date.today()

    receivables_query = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user_id,
            Invoice.status.in_(["sent", "overdue", "draft"]),
        )
        .order_by(Invoice.due_date.is_(None), Invoice.due_date.asc(), Invoice.created_at.desc())
        .limit(MAX_RECEIVABLES)
    )
    receivables = [_receivable_dict(invoice, today) for invoice in receivables_query.all()]

    compliance_query = (
        db.query(ComplianceTask)
        .filter(ComplianceTask.user_id == user_id, ComplianceTask.status != "completed")
        .order_by(ComplianceTask.due_date.is_(None), ComplianceTask.due_date.asc(), ComplianceTask.created_at.desc())
        .limit(MAX_COMPLIANCE)
    )
    compliance_tasks = [_compliance_dict(task, today) for task in compliance_query.all()]

    stale_cutoff = today - timedelta(days=3)
    followup_transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            or_(
                Transaction.requires_follow_up.is_(True),
                Transaction.has_receipt.is_(False),
                and_(Transaction.ledger_status != "cleared", Transaction.date <= stale_cutoff),
            ),
        )
        .order_by(Transaction.date.desc())
        .limit(MAX_ACTIONS)
        .all()
    )

    upcoming_end = today + timedelta(days=UPCOMING_WINDOW_DAYS)
    scheduled_transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.scheduled_for.isnot(None),
            Transaction.scheduled_for >= today,
            Transaction.scheduled_for <= upcoming_end,
        )
        .order_by(Transaction.scheduled_for.asc())
        .limit(MAX_EVENTS)
        .all()
    )

    action_inbox = _build_action_inbox(today, followup_transactions, compliance_tasks, receivables)
    upcoming_events = _build_upcoming_events(today, scheduled_transactions, compliance_tasks, receivables)

    return {
        "receivables": receivables,
        "compliance_queue": compliance_tasks,
        "action_inbox": action_inbox,
        "upcoming_events": upcoming_events,
    }
def _date_to_iso(value: Optional[date]) -> Optional[str]:
    return value.isoformat() if value else None
