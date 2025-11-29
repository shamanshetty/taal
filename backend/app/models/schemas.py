from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime

# Transaction Schemas
class TransactionBase(BaseModel):
    type: Literal["income", "expense", "transfer"]
    amount: float = Field(gt=0)
    currency: str = "INR"
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    date: date
    client_id: Optional[str] = None
    scheduled_for: Optional[date] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    gst_eligible: bool = False
    gst_rate: Optional[float] = None
    ledger_status: Literal["unreconciled", "pending", "cleared"] = "unreconciled"
    requires_follow_up: bool = False
    follow_up_reason: Optional[str] = None
    has_receipt: bool = False
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    source: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

# Goal Schemas
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    status: Literal["active", "paused", "achieved"] = "active"
    priority: Literal["high", "medium", "low"] = "medium"
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0, default=0)
    deadline: Optional[date] = None
    monthly_contribution: float = 0
    required_monthly: float = 0
    icon_key: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[Literal["active", "paused", "achieved"]] = None
    priority: Optional[Literal["high", "medium", "low"]] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[date] = None
    monthly_contribution: Optional[float] = None
    required_monthly: Optional[float] = None
    icon_key: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class GoalResponse(GoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

# Financial Pulse Schema
class FinancialPulseResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    trend: Literal["up", "down", "stable"]
    volatility: float
    savings_rate: float
    insights: list

# Chat Schemas
class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    use_voice: bool = False
    language: str = "en"
    history: List[ChatHistoryItem] = Field(default_factory=list)
    persist_memories: bool = False

class ChatResponse(BaseModel):
    response: str
    audio_url: Optional[str] = None
    timestamp: datetime

# What-If Scenario Schema
class WhatIfRequest(BaseModel):
    purchase_amount: float = Field(gt=0)
    purchase_description: str

class WhatIfResponse(BaseModel):
    purchase_amount: float
    purchase_description: str
    impact: dict
    recommendation: str
    chart_data: list

# Tax Insights Schema
class TaxInsightResponse(BaseModel):
    estimated_tax: float
    quarter: str
    breakdown: dict
    suggestions: list


class ReceivableItem(BaseModel):
    id: str
    title: str
    client_name: Optional[str] = None
    amount: float
    currency: str
    due_date: Optional[date] = None
    status_label: str


class ComplianceQueueItem(BaseModel):
    id: str
    title: str
    task_type: Optional[str] = None
    due_date: Optional[date] = None
    status: str
    notes: Optional[str] = None
    urgency_label: str


class ActionInboxItem(BaseModel):
    id: str
    title: str
    category: str
    urgency: str
    kind: Literal["transaction", "invoice", "compliance"]
    amount: Optional[float] = None


class UpcomingEventItem(BaseModel):
    id: str
    title: str
    date: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    type: Literal["inflow", "outflow", "task"]
    source: str


class DashboardHighlightsResponse(BaseModel):
    receivables: List[ReceivableItem]
    compliance_queue: List[ComplianceQueueItem]
    action_inbox: List[ActionInboxItem]
    upcoming_events: List[UpcomingEventItem]

# Income Source Schema
class IncomeSourceBase(BaseModel):
    source_name: str
    source_type: Literal["monthly", "freelance", "gig", "other"]
    amount: float = Field(gt=0)
    frequency: Literal["one-time", "weekly", "monthly", "quarterly"]

class IncomeSourceCreate(IncomeSourceBase):
    pass

class IncomeSourceResponse(IncomeSourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
