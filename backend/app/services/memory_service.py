from __future__ import annotations

from typing import Any, Dict, List, Sequence, Tuple

from langchain_openai import OpenAIEmbeddings
from sqlalchemy import Select, and_, select
from sqlalchemy.orm import Session

from app.models.db_models import AgentMemory

_EMBEDDINGS_MODEL = "text-embedding-3-small"
_embeddings: OpenAIEmbeddings | None = None
_MAX_MERGE_UPDATES = 4


def _get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(model=_EMBEDDINGS_MODEL)
    return _embeddings


def _clean_metadata(metadata: Dict[str, Any] | None) -> Dict[str, Any]:
    return metadata or {}


def _parse_memory_sections(content: str) -> Tuple[List[str], List[str]]:
    facts: List[str] = []
    followups: List[str] = []
    section: str | None = None
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.lower().startswith("user facts"):
            section = "facts"
            continue
        if line.lower().startswith("follow-ups"):
            section = "followups"
            continue
        if line.startswith("-"):
            value = line[1:].strip()
            if value.upper() == "NO_MEMORY":
                continue
            if section == "facts":
                facts.append(value)
            elif section == "followups":
                followups.append(value)
    return facts, followups


def _format_memory_content(facts: Sequence[str], followups: Sequence[str]) -> str:
    fact_lines = facts or []
    followup_lines = followups or []
    lines: List[str] = ["User Facts:"]
    if fact_lines:
        lines.extend(f"- {item}" for item in fact_lines)
    else:
        lines.append("- NO_MEMORY")
    lines.append("")
    lines.append("Follow-ups:")
    if followup_lines:
        lines.extend(f"- {item}" for item in followup_lines)
    else:
        lines.append("- NO_MEMORY")
    return "\n".join(lines)


def _merge_unique(existing: List[str], new_items: Sequence[str]) -> Tuple[List[str], bool]:
    merged = list(existing)
    changed = False
    for item in new_items:
        if item and item not in merged:
            merged.append(item)
            changed = True
    return merged, changed


def _maybe_merge_with_latest(
    db: Session,
    *,
    user_id: str,
    topic: str | None,
    content: str,
    metadata: Dict[str, Any],
    embedding: Sequence[float] | None,
) -> AgentMemory | None:
    stmt: Select[tuple[AgentMemory]] = (
        select(AgentMemory)
        .where(
            and_(
                AgentMemory.user_id == user_id,
                AgentMemory.topic == topic,
            )
        )
        .order_by(AgentMemory.created_at.desc())
        .limit(1)
    )
    latest = db.scalar(stmt)
    if not latest:
        return None

    entry_count = int((latest.meta or {}).get("entry_count", 1))
    if entry_count >= _MAX_MERGE_UPDATES:
        return None

    latest_facts, latest_followups = _parse_memory_sections(latest.content or "")
    new_facts, new_followups = _parse_memory_sections(content)

    merged_facts, facts_changed = _merge_unique(latest_facts, new_facts)
    merged_followups, followups_changed = _merge_unique(latest_followups, new_followups)

    if not facts_changed and not followups_changed:
        return latest  # nothing new worth persisting

    latest.content = _format_memory_content(merged_facts, merged_followups)
    meta = dict(latest.meta or {})
    meta.update(metadata)
    meta["entry_count"] = entry_count + 1
    latest.meta = meta
    if embedding:
        latest.embedding = list(embedding)
    db.commit()
    db.refresh(latest)
    return latest


def generate_embedding(text: str) -> List[float]:
    """Generate an OpenAI embedding for free-form text."""
    if not text.strip():
        return []
    embeddings = _get_embeddings()
    return embeddings.embed_query(text)


def store_memory(
    db: Session,
    *,
    user_id: str,
    content: str,
    topic: str | None = None,
    metadata: Dict[str, Any] | None = None,
    embedding: Sequence[float] | None = None,
) -> AgentMemory:
    """Persist a conversational memory chunk for a user."""
    vector = list(embedding) if embedding is not None else generate_embedding(content)
    cleaned_metadata = _clean_metadata(metadata)
    cleaned_metadata.setdefault("entry_count", 1)
    merged = _maybe_merge_with_latest(
        db,
        user_id=user_id,
        topic=topic,
        content=content,
        metadata=cleaned_metadata,
        embedding=vector,
    )
    if merged:
        return merged

    memory = AgentMemory(
        user_id=user_id,
        topic=topic,
        content=content,
        embedding=vector if vector else None,
        meta=cleaned_metadata,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


def fetch_relevant_memories(
    db: Session,
    *,
    user_id: str,
    query: str,
    limit: int = 3,
) -> List[AgentMemory]:
    """Return the most relevant stored memories for a query."""
    if not user_id or not query.strip():
        return []

    query_embedding = generate_embedding(query)
    if not query_embedding:
        return []

    stmt: Select[tuple[AgentMemory]] = (
        select(AgentMemory)
        .where(
            and_(
                AgentMemory.user_id == user_id,
                AgentMemory.embedding.is_not(None),
            )
        )
        .order_by(AgentMemory.embedding.cosine_distance(query_embedding))
        .limit(limit)
    )
    return list(db.scalars(stmt).all())
