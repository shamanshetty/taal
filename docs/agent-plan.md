# Agentic Platform Plan _(LangGraph + OpenAI)_

## Strategic Context
- TaalAI targets Indian gig workers whose earnings, invoicing cadence, and compliance duties fluctuate monthly. The assistant must de-jargonize Union Budget updates, GST/TDS slabs, presumptive taxation (44ADA), and Code on Social Security changes into simple nudges.
- Single-agent prompts can't juggle budgeting, compliance, empathy, and anomaly detection simultaneously. A hierarchical LangGraph graph lets us mimic a financial consultancy: a receptionist/orchestrator routes requests to specialist departments (budget analyst, tax accountant, receivable clerk, anomaly/risk monitor).
- Beyond chat, the platform must run scheduled automations (monthly pulse, quarterly tax prep) and expose “glass box” reasoning (streaming tool/thought traces similar to ChatGPT/Perplexity) so users trust the outcomes.

## Objectives
- Replace the current single-shot `CoachAgent` calls with a LangGraph-based multi-agent architecture so every conversation flows through structured graphs, tool calls, and memory updates.
- Support OpenAI models (GPT-4o / GPT-4o-mini) for all reasoning nodes, with future pluggability for Gemini or others.
- Provide streaming updates to the frontend (showing intermediate tool calls and reasoning, similar to ChatGPT/Perplexity), so users can see what the agent is doing.
- Integrate Retrieval-Augmented Generation (RAG) against our documentation/policy corpus.
- Persist both short-term conversational memory and long-term financial memory per user in Supabase Postgres (with pgvector), so each interaction builds on prior insights.

## High-Level Architecture
```
Frontend (Next.js)  ──►  FastAPI gateway  ──►  LangGraph Supervisor
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 │                         │                        │
        Cashflow graph              Tax graph                Goals graph
      (budget/variance)          (compliance)               (planner)
                 │                         │                        │
             Tool nodes               Tool nodes                Tool nodes
        (SQL, calc, RAG)        (SQL, RAG, tasks)          (SQL, planner)
                 │                         │                        │
          Supabase DB +            Supabase DB +              Supabase DB +
           pgvector mem             pgvector mem               pgvector mem
```
- **Router Graph**: classifies user intent (cash/tax/goal/generic) via an OpenAI model, then routes to the appropriate subgraph.
- **Subgraphs**: Each subgraph is a LangGraph `StateGraph` composed of nodes for loading context, retrieving memory, calling tools (SQL, calculators, RAG), reasoning with the LLM, and persisting updated memory/tasks.
- **Memory**:
  - Conversational memory chunks stored in `agent_memories` (pgvector) for retrieval in future chats.
  - Long-term financial memory (e.g., last recommendation, flagged risks) stored per user.
- **RAG**: ingest documentation (GST rules, TDS playbooks, product guides) into a `documents` table with pgvector embeddings. A LangGraph node will call a retriever before forming answers that need policy context.

## Components & Responsibilities
| Component | Responsibilities |
| --- | --- |
| `langgraph_router.py` (Supervisor) | Intent classification, shared conversation state, fan-out to worker graphs, streaming telemetry, human-in-the-loop fallback. |
| `cash_graph.py` (Budget Agent) | Load profile + transactions, run `buildMonthlyRecords`, detect variance/anomalies, recommend runway actions, update memory/tasks. |
| `tax_graph.py` (Compliance Agent) | Read tax/tax_deductions/tax_provisions tables, evaluate quarterly goals, tap RAG for legal citations, populate compliance queue. |
| `goal_graph.py` (Goal Agent) | Summarise goal progress, compute contribution planner, update “focus goal” memory, trigger nudges. |
| `invoice_graph.py` (Receivable Agent) | Monitor invoices & income ledger status, maintain aging buckets, request missing proofs, feed data to tax agent. |
| `anomaly_graph.py` (Risk Agent) | Outlier detection (duplicates, Section 44ADA breaches); writes alerts to `agent_memories` + optional compliance tasks. |
| `report_graph.py` (Summariser) | Generate monthly/quarterly narratives + structured JSON for dashboards/WhatsApp digests. |
| Tool wrappers | Wrap service calls (`fetchTransactions`, `fetchGoals`, `calculateNewRegimeTax`, etc.) for deterministic LangGraph tool nodes. |
| Memory service | CRUD helpers for `agent_memories` (vector upserts + retrieval) and future structured fact storage. |
| RAG ingestion | Script that chunks regulatory docs, embeds with OpenAI embeddings, and writes to `documents` table. |

## Agent Roster & Flows
1. **Supervisor (Router)** – OpenAI-based intent classifier + business rules; stitches conversation state, guards against loops, triggers human-in-the-loop when uncertainty high.
2. **Budget & Goal Agent** – uses `buildMonthlyRecords`, `buildScenarioInsights`, goal services to track cash variance, goal pace, and autopilot contributions.
3. **Tax & Compliance Agent** – reads `tax_profiles`, `tax_deductions`, `tax_provisions`, `transactions`, `invoices`; monitors quarterly advance tax %, Section 44ADA thresholds, GST filings; cites policy via RAG.
4. **Invoice & Receivable Agent** – monitors `invoices` + uncleared income transactions, builds aging buckets, tracks proof attachments, opens follow-up tasks.
5. **Savings & Investment Coach** – interprets surplus trends and user risk metadata to recommend SIP-style savings, emergency fund top-ups, or rebalancing actions.
6. **Anomaly/Risk Agent** – detects duplicates/outliers, compliance breaches, or suspicious ledger states; writes alerts into memory and optionally inserts compliance tasks.
7. **Report/Summariser Agent** – composes monthly/quarterly narratives + structured JSON for dashboards or WhatsApp/email digests.
8. **Scheduler/Event Triggers** – Supabase cron jobs or DB webhooks that run periodic workflows (monthly pulse, quarterly tax prep, receivable sweeps) outside of chat episodes.

## Hosting & Deployment
- **LangGraph runtime inside FastAPI**: We can run LangGraph graphs in-process (easiest) or as a separate service. For now, plan to embed the router/subgraphs inside FastAPI and reuse existing uvicorn deployment.
- **Streaming**: Use LangGraph’s `async_iterator` to stream state transitions back through FastAPI (Server Sent Events / WebSockets) so the frontend can show “thinking…” updates (tool calls, intermediate reasoning).
- **Authentication**: The backend already enforces user_id via Supabase Auth. Ensure LangGraph runs with that `user_id` to scope memory + data access.

## Tooling & Memory Details
1. **Supabase SQL Tool** – wrap service-layer helpers (transactions, goals, invoices, compliance_tasks) with read-only + writer credentials.
2. **Financial calculators** – expose deterministic functions (`buildMonthlyRecords`, `calculateNewRegimeTax`, anomaly detectors, goal planner) as LangGraph tools.
3. **RAG Retriever** – `retrieve_docs(question)` hitting the `documents` pgvector table (OpenAI `text-embedding-3-small`).
4. **Memory read/write** – `load_recent_memory(user_id, topic)` (vector similarity search) & `append_memory(user_id, summary, embedding)`; `fact_store` helper for key/value facts.
5. **Task/notification management** – tool to add entries into `compliance_tasks` or schedule notifications (email/WhatsApp) via Supabase Edge Function.
6. **Observability tool** – optionally log each tool invocation & latency into `agent_logs` table for audits.

## Memory & Knowledge Fabric
- **Short-term conversation memory**: chunked summaries stored in `agent_memories` (pgvector). Retrieve top-k per request.
- **Long-term factual memory**: future `agent_facts`/KV store for structured insights (e.g., "Advance tax Q2 target 45% due 15 Sep"). Each fact would have TTL/expires_at.
- **Behavior history**: monthly snapshots of anomalies, receivable backlog, tax readiness to feed the Report agent.
- **RAG corpus**: ingest GST/TDS guides, presumptive taxation FAQs, Code on Social Security notes, onboarding SOPs, etc.
- **Context fusion**: router graph merges conversation memory + fact memory + optional RAG docs before calling reasoning nodes.

## Streaming UX (like ChatGPT)
- LangGraph provides callbacks each time a node finishes.
- FastAPI endpoint `/api/chat/stream` can yield SSE chunks:
  - `type: node_start` / `node_end` with node name, tool info.
  - `type: token` for streaming LLM output.
- Frontend `ChatPage` can listen to SSE and render the “thinking” timeline (e.g., “Fetching income history…”, “Calculating tax impact…”).

## RAG Integration Plan
1. Collect internal docs + policy PDFs.
2. Write `scripts/ingest_docs.py`: chunk, embed (OpenAI `text-embedding-3-small`), store in Supabase `documents (id, content, metadata, embedding vector)`.
3. In LangGraph, add `rag_node` before final response when user intent requires policy context (tax, compliance).
4. Format final answers with citations (document titles/links).

## Next Steps
1. **Data prep & schema**
   - [x] Add `agent_memories` (id, user_id, topic, content, embedding, metadata, created_at) table.
   - [x] Enable pgvector extension if not already.
   - [ ] Add `documents` table for RAG (content, source, tags, embedding).
2. **LangGraph scaffolding**
   - [ ] Install `langgraph`, `langchain-openai`, `langchain`.
   - [ ] Create router graph + base subgraphs (cash/tax/goals/invoice/anomaly) wired to service tools; define state dataclasses.
   - [ ] Implement OpenAI node wrappers (gpt-4o-mini for reasoning/classifiers, gpt-4o for final narratives) with retry/backoff.
3. **Memory + RAG**
   - [ ] Build memory service (vector upsert/retrieval + fact CRUD).
   - [ ] Implement RAG ingestion script, retriever node, and citation utilities.
4. **Streaming API**
   - [ ] Create SSE endpoint streaming LangGraph events.
   - [ ] Update frontend chat UI to render streaming steps/thoughts and persist transcripts.
5. **Observability**
   - [ ] Log LangGraph state transitions (node, duration, tool inputs/outputs) to Supabase for debugging; optionally export metrics to Grafana.
   - [ ] Add evaluation harness comparing agent outputs vs heuristics (unit tests + golden conversations).
6. **Security & tokens**
   - [ ] Store OpenAI API key in backend `.env`.
   - [ ] Rate-limit LangGraph calls per user/session.
7. **Automation hooks**
   - [ ] Wire Supabase cron jobs & DB webhooks to trigger scheduled/event-driven agents.
   - [ ] Define safe action templates for notifications (email/WhatsApp) referencing compliance guidelines.

## Open Questions / Decisions Needed
1. **RAG corpus** – pending list of approved docs (tax bulletins, GST cheat sheets, product SOPs) + licensing considerations.
2. **Streaming transport** – SSE vs WebSocket; currently assuming SSE but we need confirmation once deployment/auth constraints are clear.
3. **Tool sandboxing** – whether to split DB credentials into read-only vs write roles for LangGraph tools.
4. **Citations** – do we require explicit citations every time RAG contributes to a response?
5. **Evaluation harness** – define golden conversations / regression tests for each agent.

## Incremental Build Plan
_Small, verifiable steps to avoid large one-shot implementations._

1. **Minimal LangGraph chat**
   - Wire `/api/chat` to a simple LangGraph graph (Supervisor + LLM node, no tools/memory) and stream tokens via SSE.

2. **Add SQL tool & cash metrics**
   - Introduce `cash_graph` that calls existing transaction services + calculators to produce run-rate summaries (no memory/RAG yet).

3. **Memory layer**
   - Create `agent_memories` table; add nodes to save/retrieve conversation summaries and basic facts.

4. **Goal & tax specialists**
   - Implement `goal_graph` and `tax_graph` with their tool nodes; update Supervisor to route based on intent.

5. **Receivable + anomaly agents**
   - Build invoice aging + anomaly detection functions and integrate as separate subgraphs; store alerts in memory/facts.

6. **RAG integration**
   - Ingest a small batch of regulatory docs; add retriever node to tax/compliance agent; (optional) render citations if required.

7. **Reporting & automation**
   - Implement `report_graph` to compile monthly summaries; set up Supabase cron/webhooks for scheduled/event-driven flows.

8. **Observability & evaluation**
   - Log node events to `agent_logs`; add regression tests/golden conversations before deployments.

## Shortcut Track (Single-Agent Upgrade)
While the full LangGraph roadmap above remains the north star, we’re also shipping a pragmatic shortcut: keep the current coach agent but give it the same powers (DB + RAG + tool calls) so we can unblock richer conversations immediately.

1. **Tool-aware system prompt**
   - Expand the supervisor prompt so the single agent knows it can query Supabase, add/update transactions/goals, and call calculators.
   - Specify what structured outputs we expect when it performs side effects (e.g., JSON payload for `create_goal`).

2. **Direct DB/tool access**
   - Add tool wrappers (inside the existing agent) that can:
     - Read/write Supabase tables (`transactions`, `goals`, `clients`, etc.).
     - Trigger calculations (cashflow summaries, tax estimators) without switching graphs.
   - Enforce RBAC/tenant scoping inside each tool call.

3. **Inline RAG**
   - Mount the tax/GST/ITR documents as a simple retriever (OpenAI embeddings → `documents` table).
   - Add a memory/tool node that fetches top-k docs when the user asks compliance/legal questions.

4. **Memory usage**
   - Keep the summarized conversational memory (pgvector) and inject it as a context snippet before each response.
   - Allow the shortcut agent to call `store_memory` for “important facts” when it executes tool actions (e.g., “Goal added”).

5. **User-facing actions**
   - Ensure the shortcut agent can:
     - List/add/update/delete goals and transactions.
     - Read key stats (cash burn, runway, tax deadlines).
     - Surface RAG citations for regulatory answers.
   - Tools now expose generic `get_table_records`, `create_table_record`, and `update_table_record` so the agent can read/write any user-owned Supabase table.

This shortcut lets us iterate quickly without building separate graphs up front; later we can lift these tool definitions into the LangGraph subgraphs with minimal rework.

Please review and add any missing requirements. Once approved, we can start implementing the schema + LangGraph scaffolding per this plan.
