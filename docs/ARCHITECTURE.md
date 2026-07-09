# Architecture Notes

## Why LangGraph (not a plain function-calling loop)

The task explicitly requires LangGraph, and it earns its place here: the agent
needs to **chain** tools in a predictable order (autofill → check missing →
optionally suggest/summarize) while staying steerable by the user at any
point ("actually change the sentiment to positive" mid-conversation should
short-circuit straight to `update_interaction`). LangGraph's `StateGraph`
gives us:

- A single shared `AgentState` (`form_data`, `missing_fields`,
  `suggested_followups`, `summary`, `autofilled_fields`, `tool_trace`,
  `messages`) that every node reads/writes explicitly — no hidden globals.
- A `MemorySaver` checkpointer keyed by `session_id`, so each rep's
  in-progress conversation persists across turns without the frontend having
  to replay full chat history on every request.
- A clean `agent ⇄ tools` loop via `add_conditional_edges`, matching the
  standard ReAct pattern, but with **manual, explicit tool execution**
  (`app/agent/tools.py::dispatch_tool_call`) instead of relying on hidden
  auto-execution — this makes every state mutation traceable and testable in
  isolation, and returns a `tool_trace` the UI can surface for transparency.

## Request lifecycle

1. Frontend sends `{ session_id, message, form_data }` to `POST /api/chat`.
   `form_data` is the *current* Redux state, so edits made directly in the
   form are visible to the agent even if the rep never mentioned them in chat.
2. `agent_node` calls Groq (`gemma2-9b-it`) with the system prompt + current
   form context + full message history for this thread, with all 5 tools bound.
3. If the model returns `tool_calls`, `tools_node` executes each one via
   `dispatch_tool_call`, which:
   - `autofill_interaction` → a *second*, narrowly-scoped Groq call with a
     strict JSON-extraction prompt (`EXTRACTION_PROMPT`), merged into
     `form_data` (list fields are unioned, not overwritten).
   - `update_interaction` → a direct, deterministic field write (no LLM call
     needed — the routing LLM already extracted `field_name`/`new_value`).
   - `check_missing_information` → pure Python check against
     `REQUIRED_FIELDS`.
   - `suggest_followups` / `generate_summary` → each makes one more scoped
     Groq call with a dedicated prompt.
4. Control returns to `agent_node`, which sees the `ToolMessage` results and
   produces a short natural-language reply (or calls another tool).
5. When the model responds with no further `tool_calls`, the graph ends and
   `/api/chat` returns the final `form_data`, `missing_fields`,
   `suggested_followups`, `summary`, `autofilled_fields`, and `tool_trace` to
   the frontend, which merges them into Redux — this is what drives the
   "AI glow" highlight on fields that just changed.

## Data model

`Interaction` (SQLAlchemy) mirrors the form 1:1, with list fields stored as
JSON columns (`attendees`, `materials_shared`, `samples_distributed`,
`follow_up_actions`, `ai_suggested_followups`) so both Postgres and MySQL work
without a join table. `HCP` and `Material` are small lookup tables seeded with
demo data for the name/material search fields.

## Extending this

- Swap `check_same_thread` SQLite default for Postgres/MySQL by setting
  `DATABASE_URL` — no code changes needed, SQLAlchemy handles the dialect.
- To add a 6th tool, add a `@tool`-decorated schema + a `run_*` handler in
  `tools.py`, register it in `ALL_TOOLS`/`DISPATCH`, and mention it in
  `SYSTEM_PROMPT` — the graph wiring in `graph.py` doesn't need to change.
- `GROQ_FALLBACK_MODEL` (`llama-3.3-70b-versatile`) is in `.env.example` as a
  drop-in for `get_llm()` if a task needs stronger reasoning than
  `gemma2-9b-it` can reliably give (e.g. very long, messy voice-note
  transcripts).
