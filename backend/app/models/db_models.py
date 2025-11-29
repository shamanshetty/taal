from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from pgvector.sqlalchemy import Vector

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
    )
    email = Column(Text, nullable=False, unique=True)
    full_name = Column(Text)
    phone = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=datetime.utcnow)

    income_sources = relationship("IncomeSource", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    pulse_history = relationship("PulseHistory", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    tax_records = relationship("TaxRecord", back_populates="user", cascade="all, delete-orphan")
    whatsapp_nudges = relationship("WhatsAppNudge", back_populates="user", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="user", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="user", cascade="all, delete-orphan")
    compliance_tasks = relationship("ComplianceTask", back_populates="user", cascade="all, delete-orphan")
    agent_memories = relationship("AgentMemory", back_populates="user", cascade="all, delete-orphan")


class IncomeSource(Base):
    __tablename__ = "income_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_name = Column(Text, nullable=False)
    source_type = Column(String(16), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    frequency = Column(String(16), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))

    __table_args__ = (
        CheckConstraint("source_type IN ('monthly','freelance','gig','other')", name="income_source_type_check"),
        CheckConstraint("frequency IN ('one-time','weekly','monthly','quarterly')", name="income_source_frequency_check"),
    )

    user = relationship("User", back_populates="income_sources")


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    email = Column(Text)
    phone = Column(Text)
    gst_number = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=datetime.utcnow)

    user = relationship("User", back_populates="clients")
    transactions = relationship("Transaction", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"))
    type = Column(String(16), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(8), nullable=False, server_default="INR")
    category = Column(Text)
    subcategory = Column(Text)
    description = Column(Text)
    date = Column(Date, nullable=False)
    scheduled_for = Column(Date)
    is_recurring = Column(Boolean, server_default=text("false"))
    recurrence_rule = Column(Text)
    gst_eligible = Column(Boolean, server_default=text("false"))
    gst_rate = Column(Numeric(5, 2))
    ledger_status = Column(String(16), server_default="unreconciled")
    requires_follow_up = Column(Boolean, server_default=text("false"))
    follow_up_reason = Column(Text)
    has_receipt = Column(Boolean, server_default=text("false"))
    tags = Column(ARRAY(Text))
    notes = Column(Text)
    source = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("type IN ('income','expense','transfer')", name="transactions_type_check"),
        CheckConstraint("ledger_status IN ('unreconciled','pending','cleared')", name="transactions_ledger_status_check"),
    )

    user = relationship("User", back_populates="transactions")
    client = relationship("Client", back_populates="transactions")
    related_invoice = relationship(
        "Invoice",
        back_populates="income_transaction",
        uselist=False,
        foreign_keys="Invoice.income_transaction_id",
    )


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"))
    number = Column(Text)
    description = Column(Text)
    issue_date = Column(Date)
    due_date = Column(Date)
    amount = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(8), nullable=False, server_default="INR")
    status = Column(String(16), nullable=False, server_default="draft")
    expected_payment_date = Column(Date)
    actual_payment_date = Column(Date)
    reminder_count = Column(Integer, nullable=False, server_default=text("0"))
    income_transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('draft','sent','paid','overdue','cancelled')", name="invoices_status_check"),
    )

    user = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    income_transaction = relationship("Transaction", back_populates="related_invoice", foreign_keys=[income_transaction_id])


class ComplianceTask(Base):
    __tablename__ = "compliance_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="SET NULL"))
    task_type = Column(String(16))
    title = Column(Text)
    due_date = Column(Date)
    status = Column(String(16), nullable=False, server_default="pending")
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("task_type IN ('gst','tax','bookkeeping')", name="compliance_task_type_check"),
        CheckConstraint("status IN ('pending','in_progress','completed')", name="compliance_task_status_check"),
    )

    user = relationship("User", back_populates="compliance_tasks")
    transaction = relationship("Transaction")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text)
    category = Column(Text)
    status = Column(String(16), nullable=False, server_default="active")
    priority = Column(String(16), nullable=False, server_default="medium")
    target_amount = Column(Numeric(14, 2), nullable=False)
    current_amount = Column(Numeric(14, 2), nullable=False, server_default=text("0"))
    deadline = Column(Date)
    monthly_contribution = Column(Numeric(14, 2), nullable=False, server_default=text("0"))
    required_monthly = Column(Numeric(14, 2), nullable=False, server_default=text("0"))
    icon_key = Column(Text)
    tags = Column(ARRAY(Text))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('active','paused','achieved')", name="goals_status_check"),
        CheckConstraint("priority IN ('high','medium','low')", name="goals_priority_check"),
    )

    user = relationship("User", back_populates="goals")


class PulseHistory(Base):
    __tablename__ = "pulse_history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)
    trend = Column(String(8), nullable=False)
    volatility = Column(Numeric(5, 3), nullable=False)
    savings_rate = Column(Numeric(5, 2), nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=text("NOW()"))

    user = relationship("User", back_populates="pulse_history")

    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 100", name="pulse_history_score_check"),
        CheckConstraint("trend IN ('up','down','stable')", name="pulse_history_trend_check"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    audio_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))

    __table_args__ = (
        CheckConstraint("role IN ('user','assistant')", name="chat_messages_role_check"),
    )

    user = relationship("User", back_populates="chat_messages")


class TaxRecord(Base):
    __tablename__ = "tax_records"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    financial_year = Column(Text, nullable=False)
    quarter = Column(String(2), nullable=False)
    estimated_tax = Column(Numeric(12, 2), nullable=False)
    paid_tax = Column(Numeric(12, 2), nullable=False, server_default=text("0"))
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    updated_at = Column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("quarter IN ('Q1','Q2','Q3','Q4')", name="tax_records_quarter_check"),
    )

    user = relationship("User", back_populates="tax_records")


class WhatsAppNudge(Base):
    __tablename__ = "whatsapp_nudges"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=text("NOW()"))
    status = Column(String(16), nullable=False, server_default="sent")

    __table_args__ = (
        CheckConstraint("status IN ('sent','delivered','read','failed')", name="whatsapp_nudges_status_check"),
    )

    user = relationship("User", back_populates="whatsapp_nudges")


class AgentMemory(Base):
    __tablename__ = "agent_memories"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(Text)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536))
    meta = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))

    user = relationship("User", back_populates="agent_memories")

