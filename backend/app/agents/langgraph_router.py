from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, List, Sequence, Tuple, TypedDict
from uuid import UUID

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Session
from sqlalchemy.sql.sqltypes import Boolean, Date, DateTime, Numeric

from app.models.db_models import (
    AgentMemory,
    ChatMessage,
    Client,
    ComplianceTask,
    Goal,
    IncomeSource,
    Invoice,
    PulseHistory,
    TaxRecord,
    Transaction,
    User,
    WhatsAppNudge,
)
from app.services import memory_service

if TYPE_CHECKING:
    from fastapi import BackgroundTasks


class ChatState(TypedDict):
    """Shared state for the minimal LangGraph workflow."""

    messages: List[BaseMessage]


logger = logging.getLogger(__name__)

_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=False)
_summary_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=False)
_db_session_ctx: ContextVar[Session | None] = ContextVar("chat_db_session", default=None)
_user_id_ctx: ContextVar[str | None] = ContextVar("chat_user_id", default=None)
_summary_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Extract only concrete facts that the USER shared about themselves, their finances, or commitments.\n"
            "Format exactly as:\n"
            "User Facts:\n"
            "- <fact 1>\n"
            "- <fact 2>\n"
            "Follow-ups:\n"
            "- <task 1>\n"
            "- <task 2>\n"
            "Rules:\n"
            "- Quote or paraphrase only what the USER explicitly stated (e.g., \"Name: Rohan\", \"Age: 35\", \"Prefers conservative investing\").\n"
            "- Follow-ups capture promises or next steps the user agreed to.\n"
            "- If no facts or follow-ups are present, reply with NO_MEMORY.\n"
            "- Never describe general knowledge or definitions.",
        ),
        ("human", "{transcript}"),
    ]
)

_SUPERVISOR_PROMPT = """
You are TaalAI, a friendly financial coach for Indian solopreneurs. Respond like a human mentor: full sentences, no Markdown bullets/bold, and weave numbers into the story (e.g., “You spent ₹18.5k on the Koramangala studio lease on 1 Nov”).

Tools available:
- get_user_snapshot / get_recent_transactions / get_active_goals for quick context.
- get_table_records(table, limit) to read any user-owned table.
- create_table_record(table, data) to insert user-owned data (transactions, goals, invoices, etc.).
- update_table_record(table, record_id, updates) to modify an existing record.

When creating or updating:
- Gather essential fields before calling a tool (transactions need type, amount, date; goals need a title and target amount). Ask clarifying questions if the user hasn’t given enough detail.
- Apply sensible defaults (currency → INR, goal status → active, etc.) only when harmless.
- After a tool call, explain what changed in conversational language and summarize the impact (“I added a Gift goal for ₹30k due 5 Dec.”).

Retrieval style:
- Instead of bullet lists, describe data in natural prose (“Here are your latest transactions...”).
- Mention sources when it helps (“I pulled this from your transaction ledger.”).
"""
def _require_context() -> Tuple[Session, str]:
    db = _db_session_ctx.get()
    user_id = _user_id_ctx.get()
    if not db or not user_id:
        raise RuntimeError("Database context is unavailable for tool execution.")
    return db, _normalize_user_id(user_id)


def _normalize_user_id(user_id: str) -> str | UUID:
    try:
        return UUID(str(user_id))
    except Exception:
        return user_id


def _to_iso(dt: datetime | date | None) -> str | None:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return datetime.combine(dt, datetime.min.time()).isoformat()


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _serialize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return _to_iso(value)
    if isinstance(value, Decimal):
        return _to_float(value)
    if isinstance(value, UUID):
        return str(value)
    return value


def _serialize_instance(instance: Any) -> dict:
    data: dict = {}
    if not hasattr(instance, "__table__"):
        return data
    for column in instance.__table__.columns:
        key = column.name
        data[key] = _serialize_value(getattr(instance, key))
    return data


def _coerce_column_value(column: Any, value: Any) -> Any:
    if value is None:
        return None
    coltype = column.type
    try:
        if isinstance(coltype, Numeric):
            return Decimal(str(value))
        if isinstance(coltype, DateTime):
            if isinstance(value, datetime):
                return value
            return datetime.fromisoformat(str(value))
        if isinstance(coltype, Date):
            if isinstance(value, date):
                return value
            return date.fromisoformat(str(value))
        if isinstance(coltype, Boolean):
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.strip().lower() in {"true", "1", "yes", "y"}
            return bool(value)
        if isinstance(coltype, PGUUID):
            if isinstance(value, UUID):
                return value
            return UUID(str(value))
    except Exception as exc:
        raise ValueError(f"Invalid value '{value}' for column '{column.name}': {exc}") from exc
    return value


def _prepare_record_kwargs(meta: dict, data: dict, *, include_user_id: bool, user_id: Any) -> Tuple[dict, List[str]]:
    allowed_fields: List[str] = meta["allowed_fields"]
    columns: dict = meta["columns"]
    prepared: dict = {}
    errors: List[str] = []
    for key, value in data.items():
        if key not in allowed_fields:
            continue
        column = columns[key]
        try:
            prepared[key] = _coerce_column_value(column, value)
        except ValueError as exc:
            errors.append(str(exc))
    if include_user_id and "user_id" in columns:
        prepared["user_id"] = user_id
    return prepared, errors


def _ensure_required_fields(meta: dict, prepared: dict) -> List[str]:
    missing: List[str] = []
    for field in meta["required_fields"]:
        if prepared.get(field) in (None, ""):
            missing.append(field)
    return missing


def _apply_table_defaults(table_key: str, prepared: dict, incoming: dict) -> None:
    if table_key == "goals":
        if not prepared.get("title"):
            title = incoming.get("title") or incoming.get("description")
            if not title:
                target = incoming.get("target_amount") or prepared.get("target_amount")
                if isinstance(target, Decimal):
                    target = f"{target.normalize()}"
                title = f"Savings goal {target}" if target else "Savings goal"
            prepared["title"] = str(title)
        if prepared.get("status") is None:
            prepared["status"] = "active"
        if prepared.get("priority") is None:
            prepared["priority"] = "medium"
        if prepared.get("current_amount") is None:
            prepared["current_amount"] = Decimal("0")
        if prepared.get("monthly_contribution") is None:
            prepared["monthly_contribution"] = Decimal("0")
        if prepared.get("required_monthly") is None:
            prepared["required_monthly"] = Decimal("0")

    if table_key == "transactions":
        if prepared.get("currency") is None:
            prepared["currency"] = "INR"
        if prepared.get("ledger_status") is None:
            prepared["ledger_status"] = "unreconciled"

    if table_key == "invoices":
        if prepared.get("currency") is None:
            prepared["currency"] = "INR"
        if prepared.get("status") is None:
            prepared["status"] = "draft"

    if table_key == "compliance_tasks" and prepared.get("status") is None:
        prepared["status"] = "pending"


def _serialize_transaction(tx: Transaction) -> dict:
    return {
        "id": str(tx.id),
        "type": tx.type,
        "amount": _to_float(tx.amount),
        "currency": tx.currency,
        "category": tx.category,
        "description": tx.description,
        "date": _to_iso(tx.date),
        "status": tx.ledger_status,
    }


def _serialize_goal(goal: Goal) -> dict:
    return {
        "id": str(goal.id),
        "title": goal.title,
        "status": goal.status,
        "priority": goal.priority,
        "target_amount": _to_float(goal.target_amount),
        "current_amount": _to_float(goal.current_amount),
        "deadline": _to_iso(goal.deadline),
    }


@tool("get_user_snapshot")
def get_user_snapshot(max_transactions: int = 5, max_goals: int = 5) -> dict:
    """
    Fetches the user's profile along with recent transactions and active goals.
    """
    db, user_id = _require_context()
    user = db.get(User, user_id)
    if not user:
        return {"error": "User not found"}

    tx_limit = max(1, min(max_transactions, 20))
    goal_limit = max(1, min(max_goals, 20))

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.desc())
        .limit(tx_limit)
        .all()
    )

    active_goals = (
        db.query(Goal)
        .filter(Goal.user_id == user_id)
        .order_by(Goal.created_at.desc())
        .limit(goal_limit)
        .all()
    )

    income_sum = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id, Transaction.type == "income"
    ).scalar()
    expense_sum = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id, Transaction.type == "expense"
    ).scalar()

    return {
        "user": {
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "created_at": _to_iso(user.created_at),
        },
        "financials": {
            "total_income": _to_float(income_sum) or 0.0,
            "total_expense": _to_float(expense_sum) or 0.0,
        },
        "recent_transactions": [_serialize_transaction(tx) for tx in transactions],
        "active_goals": [_serialize_goal(goal) for goal in active_goals],
    }


@tool("get_recent_transactions")
def get_recent_transactions(limit: int = 5) -> dict:
    """
    Returns the most recent transactions for the current user.
    """
    db, user_id = _require_context()
    tx_limit = max(1, min(limit, 20))
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
        .limit(tx_limit)
        .all()
    )
    return {"transactions": [_serialize_transaction(tx) for tx in transactions]}


@tool("get_active_goals")
def get_active_goals(limit: int = 5) -> dict:
    """
    Returns the current goals for the user.
    """
    db, user_id = _require_context()
    goal_limit = max(1, min(limit, 20))
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == user_id)
        .order_by(Goal.created_at.desc())
        .limit(goal_limit)
        .all()
    )
    return {"goals": [_serialize_goal(goal) for goal in goals]}


_MODEL_TABLES = {
    "users": User,
    "transactions": Transaction,
    "goals": Goal,
    "income_sources": IncomeSource,
    "clients": Client,
    "invoices": Invoice,
    "compliance_tasks": ComplianceTask,
    "pulse_history": PulseHistory,
    "chat_messages": ChatMessage,
    "tax_records": TaxRecord,
    "whatsapp_nudges": WhatsAppNudge,
}

def _build_allowed_fields(model: Any) -> List[str]:
    skip = {"id", "user_id", "created_at", "updated_at", "created_on", "updated_on"}
    return [
        column.name
        for column in model.__table__.columns
        if column.name not in skip
    ]


def _infer_required_fields(model: Any) -> List[str]:
    required: List[str] = []
    for column in model.__table__.columns:
        if column.name in {"id", "user_id", "created_at", "updated_at", "created_on", "updated_on"}:
            continue
        if (
            not column.nullable
            and column.default is None
            and column.server_default is None
            and not isinstance(column.type, Boolean)
        ):
            required.append(column.name)
    return required


def _primary_key_column(model: Any):
    for column in model.__table__.columns:
        if column.primary_key:
            return column
    raise ValueError(f"Model {model.__name__} does not have a primary key.")


def _build_writable_meta() -> dict:
    writable: dict = {}
    for table, model in _MODEL_TABLES.items():
        if model is User:
            continue  # user rows handled elsewhere
        writable[table] = {
            "model": model,
            "columns": {column.name: column for column in model.__table__.columns},
            "allowed_fields": _build_allowed_fields(model),
            "required_fields": _infer_required_fields(model),
            "primary_key": _primary_key_column(model),
        }
    return writable


_WRITABLE_TABLES = _build_writable_meta()


def _query_model_records(db: Session, user_id: Any, model: Any, limit: int) -> List[Any]:
    query = db.query(model)
    if hasattr(model, "user_id"):
        query = query.filter(model.user_id == user_id)
    elif model is User:
        query = query.filter(User.id == user_id)
    order_column = getattr(model, "created_at", None)
    if order_column is not None:
        query = query.order_by(order_column.desc())
    return query.limit(limit).all()


def _fetch_user_record(db: Session, meta: dict, user_id: Any, record_id: Any):
    model = meta["model"]
    pk_column = meta["primary_key"]
    try:
        pk_value = _coerce_column_value(pk_column, record_id)
    except ValueError as exc:
        raise ValueError(f"Invalid record_id: {exc}") from exc
    query = db.query(model).filter(pk_column == pk_value)
    if "user_id" in meta["columns"]:
        query = query.filter(model.user_id == user_id)
    return query.first()


@tool("get_table_records")
def get_table_records(table: str, limit: int = 10) -> dict:
    """
    Fetch generic records from an allowed Supabase table for the current user.
    """
    db, user_id = _require_context()
    table_key = (table or "").strip().lower()
    model = _MODEL_TABLES.get(table_key)
    if not model:
        return {
            "error": f"Table '{table}' is not accessible. Allowed tables: {list(_MODEL_TABLES.keys())}"
        }
    record_limit = max(1, min(limit, 50))
    rows = _query_model_records(db, user_id, model, record_limit)
    return {"table": table_key, "records": [_serialize_instance(row) for row in rows]}


@tool("create_table_record")
def create_table_record(table: str, data: dict) -> dict:
    """
    Create a new record in a user-owned table (transactions, goals, etc.).
    """
    db, user_id = _require_context()
    table_key = (table or "").strip().lower()
    meta = _WRITABLE_TABLES.get(table_key)
    if not meta:
        return {"error": f"Table '{table}' is not writable. Allowed tables: {list(_WRITABLE_TABLES.keys())}"}
    if not isinstance(data, dict):
        return {"error": "Data must be an object with field/value pairs."}

    prepared, errors = _prepare_record_kwargs(meta, data, include_user_id=True, user_id=user_id)
    _apply_table_defaults(table_key, prepared, data)
    missing = _ensure_required_fields(meta, prepared)
    if missing:
        errors.append(f"Missing required fields: {missing}")
    if errors:
        return {"error": errors}

    model = meta["model"]
    record = model(**prepared)
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"table": table_key, "record": _serialize_instance(record)}


@tool("update_table_record")
def update_table_record(table: str, record_id: str, updates: dict) -> dict:
    """
    Update an existing record identified by `record_id` in a user-owned table.
    """
    db, user_id = _require_context()
    table_key = (table or "").strip().lower()
    meta = _WRITABLE_TABLES.get(table_key)
    if not meta:
        return {"error": f"Table '{table}' is not writable. Allowed tables: {list(_WRITABLE_TABLES.keys())}"}
    if not isinstance(updates, dict):
        return {"error": "Updates must be an object with field/value pairs."}

    record = _fetch_user_record(db, meta, user_id, record_id)
    if not record:
        return {"error": "Record not found or access denied."}

    prepared, errors = _prepare_record_kwargs(meta, updates, include_user_id=False, user_id=user_id)
    if not prepared and not errors:
        return {"error": "No valid fields provided for update."}

    for key, value in prepared.items():
        setattr(record, key, value)

    db.commit()
    db.refresh(record)
    return {"table": table_key, "record": _serialize_instance(record), "warnings": errors or None}


_TOOLS = [
    get_user_snapshot,
    get_recent_transactions,
    get_active_goals,
    get_table_records,
    create_table_record,
    update_table_record,
]
_TOOL_MAP = {tool.name: tool for tool in _TOOLS}


def _dump_tool_output(payload: Any) -> str:
    try:
        return json.dumps(payload, default=str)
    except Exception:
        return json.dumps({"result": str(payload)})


def _llm_node(state: ChatState) -> ChatState:
    """Graph node that handles tool calls before returning the final reply."""
    llm_with_tools = _llm.bind_tools(_TOOLS)
    messages: List[BaseMessage] = list(state["messages"])
    response = llm_with_tools.invoke(messages)
    messages.append(response)

    while getattr(response, "tool_calls", None):
        for call in response.tool_calls or []:
            tool_name = call.get("name")
            call_id = call.get("id")
            args = call.get("args") or {}
            tool = _TOOL_MAP.get(tool_name or "")
            if not tool:
                tool_result = {"error": f"Tool '{tool_name}' is not available."}
            else:
                try:
                    tool_result = tool.invoke(args)
                except Exception as exc:  # pragma: no cover - defensive logging
                    logger.warning("Tool %s failed: %s", tool_name, exc)
                    tool_result = {"error": str(exc)}
            messages.append(
                ToolMessage(
                    content=_dump_tool_output(tool_result),
                    name=tool_name or "unknown",
                    tool_call_id=call_id or "",
                )
            )
        response = llm_with_tools.invoke(messages)
        messages.append(response)

    return {"messages": messages}


_graph_builder = StateGraph(ChatState)
_graph_builder.add_node("assistant", _llm_node)
_graph_builder.set_entry_point("assistant")
_graph_builder.add_edge("assistant", END)
chat_graph = _graph_builder.compile()


def _extract_role_content(item: Any) -> Tuple[str | None, str]:
    if isinstance(item, dict):
        return item.get("role"), item.get("content", "") or ""
    role = getattr(item, "role", None)
    content = getattr(item, "content", "") or ""
    return role, content


def _convert_history(history: Sequence[Any]) -> List[BaseMessage]:
    converted: List[BaseMessage] = []
    for item in history:
        role, content = _extract_role_content(item)
        if role == "assistant":
            converted.append(AIMessage(content=content))
        else:
            converted.append(HumanMessage(content=content))
    return converted


def _format_memory_messages(memories: Sequence[AgentMemory]) -> List[BaseMessage]:
    if not memories:
        return []
    lines: List[str] = []
    for memory in memories:
        topic_prefix = f"[{memory.topic}] " if memory.topic else ""
        lines.append(f"{topic_prefix}{memory.content}")
    content = "Relevant previous context:\n" + "\n".join(f"- {line}" for line in lines)
    return [SystemMessage(content=content)]


def _recent_dialogue(messages: Sequence[BaseMessage], limit: int = 6) -> List[BaseMessage]:
    dialogue = [msg for msg in messages if isinstance(msg, (HumanMessage, AIMessage))]
    return dialogue[-limit:]


def _transcript_from_messages(messages: Sequence[BaseMessage]) -> str:
    lines: List[str] = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            speaker = "User"
        elif isinstance(msg, AIMessage):
            speaker = "Assistant"
        else:
            continue
        content = (msg.content or "").strip()
        if content:
            lines.append(f"{speaker}: {content}")
    return "\n".join(lines)


def _summarize_dialogue(messages: Sequence[BaseMessage]) -> str:
    transcript = _transcript_from_messages(messages)
    if not transcript:
        return ""
    prompt_messages = _summary_prompt.format_messages(transcript=transcript)
    summary_response = _summary_llm.invoke(prompt_messages)
    summary = (summary_response.content or "").strip()
    if summary.upper() == "NO_MEMORY":
        return ""
    return summary


def _load_memory_messages(
    db: Session | None,
    user_id: str | None,
    query: str,
) -> List[BaseMessage]:
    if not db or not user_id:
        return []
    try:
        memories = memory_service.fetch_relevant_memories(
            db, user_id=user_id, query=query, limit=3
        )
    except Exception as exc:  # pragma: no cover - logging only
        logger.warning("Failed to load agent memories: %s", exc)
        return []
    return _format_memory_messages(memories)


def _serialize_dialogue(messages: Sequence[BaseMessage]) -> List[Tuple[str, str]]:
    serialized: List[Tuple[str, str]] = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            serialized.append(("human", msg.content or ""))
        elif isinstance(msg, AIMessage):
            serialized.append(("ai", msg.content or ""))
    return serialized


def _deserialize_dialogue(payload: Sequence[Tuple[str, str]]) -> List[BaseMessage]:
    dialogue: List[BaseMessage] = []
    for role, content in payload:
        if role == "human":
            dialogue.append(HumanMessage(content=content))
        elif role == "ai":
            dialogue.append(AIMessage(content=content))
    return dialogue


def _persist_conversation_memory(
    db: Session,
    user_id: str,
    messages: Sequence[BaseMessage],
) -> None:
    try:
        dialogue = _recent_dialogue(messages)
        summary = _summarize_dialogue(dialogue)
        if not summary:
            return
        metadata = {
            "source": "chat",
            "message_count": len(dialogue),
        }
        memory_service.store_memory(
            db,
            user_id=user_id,
            content=summary,
            topic="conversation",
            metadata=metadata,
        )
    except Exception as exc:  # pragma: no cover - logging only
        logger.warning("Failed to persist conversation memory: %s", exc)


def _persist_memory_job(user_id: str, payload: Sequence[Tuple[str, str]]) -> None:
    from app.db import SessionLocal

    dialogue = _deserialize_dialogue(payload)
    if not dialogue:
        return

    db = SessionLocal()
    try:
        _persist_conversation_memory(db, user_id, dialogue)
    finally:
        db.close()


def schedule_memory_persist(
    background_tasks: "BackgroundTasks" | None,
    user_id: str | None,
    messages: Sequence[BaseMessage],
) -> None:
    if not background_tasks or not user_id:
        return
    serialized = _serialize_dialogue(_recent_dialogue(messages))
    if not serialized:
        return
    background_tasks.add_task(_persist_memory_job, user_id, serialized)




def invoke_chat(
    message: str,
    history: Sequence[Any] | None = None,
    *,
    user_id: str | None = None,
    db: Session | None = None,
) -> Tuple[str, List[BaseMessage]]:
    """Return the assistant's final reply and the resulting message list."""
    initial_messages: List[BaseMessage] = [SystemMessage(content=_SUPERVISOR_PROMPT)]
    initial_messages.extend(_load_memory_messages(db, user_id, message))
    if history:
        initial_messages.extend(_convert_history(history))
    initial_messages.append(HumanMessage(content=message))

    db_token = _db_session_ctx.set(db) if db else None
    user_token = _user_id_ctx.set(user_id) if user_id else None
    try:
        final_state = chat_graph.invoke({"messages": initial_messages})
    finally:
        if db_token is not None:
            _db_session_ctx.reset(db_token)
        if user_token is not None:
            _user_id_ctx.reset(user_token)

    ai_messages = [msg for msg in final_state["messages"] if isinstance(msg, AIMessage)]
    if not ai_messages:
        return "", final_state["messages"]
    response = ai_messages[-1].content
    return response, final_state["messages"]
