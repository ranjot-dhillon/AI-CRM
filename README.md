# AI-First HCP CRM — Log Interaction Screen

A working reference implementation of the **Log HCP Interaction** screen for an
AI-first pharma CRM. Field reps can log an interaction with a Healthcare
Professional either by filling the structured form on the left, or by just
describing what happened in the chat panel on the right — the AI Assistant
extracts structured fields, fills the form live, flags what's still missing,
and suggests smart follow-ups, all through a real LangGraph agent backed by Groq.

<p>
  <img alt="stack" src="https://img.shields.io/badge/frontend-React%20%2B%20Redux-2954A6">
  <img alt="stack" src="https://img.shields.io/badge/backend-FastAPI-1fa15e">
  <img alt="stack" src="https://img.shields.io/badge/agent-LangGraph-12b899">
  <img alt="stack" src="https://img.shields.io/badge/LLM-Groq%20gemma2--9b--it-c98a15">
</p>

## What this covers

| Requirement | Where |
|---|---|
| Structured form **and** conversational chat, on one screen | `frontend/src/App.jsx` (two-pane layout) |
| React + Redux | `frontend/src` (`@reduxjs/toolkit`, `react-redux`) |
| FastAPI backend | `backend/app/main.py` + routers |
| LangGraph agent | `backend/app/agent/graph.py` |
| Groq (`gemma2-9b-it`, function-calling) | `backend/app/agent/tools.py::get_llm` |
| Postgres / MySQL (via SQLAlchemy) | `backend/app/database.py`, `backend/app/models.py` |
| Google Inter font | `frontend/index.html` + `frontend/src/index.css` |
| 5 required tools | `backend/app/agent/tools.py` (see below) |

### The 5 tools (all LangGraph tools, executed by the agent graph)

1. **`autofill_interaction`** — extracts structured CRM fields (HCP name, type,
   date/time, attendees, topics, materials, samples, sentiment, outcomes,
   follow-ups) from the rep's free text and merges them into the form.
2. **`update_interaction`** — edits one existing field conversationally
   ("change sentiment to positive", "add Dr. Rao to attendees").
3. **`check_missing_information`** — checks the required fields (HCP name,
   interaction type, date, topics discussed, sentiment) and reports what's
   still missing; surfaced as a sticky amber banner + clickable chips in the UI.
4. **`suggest_followups`** — recommends 2-4 prioritized next actions based on
   topics/outcomes/sentiment already captured.
5. **`generate_summary`** — writes a concise, professional interaction summary
   for the CRM record.

## Architecture

```
┌────────────────────────────┐        POST /api/chat        ┌─────────────────────────────┐
│  React + Redux (Vite)      │ ────────────────────────────▶ │  FastAPI                    │
│                             │                               │                              │
│  ┌───────────┐ ┌─────────┐ │ ◀──────────────────────────── │  ┌────────────────────────┐  │
│  │ Structured│ │  Chat   │ │   form_data / missing /       │  │  LangGraph agent graph  │  │
│  │   Form    │ │Assistant│ │   suggestions / summary        │  │                          │  │
│  └───────────┘ └─────────┘ │                               │  │  agent (Groq LLM +      │  │
│        ▲            │      │                               │  │  tool-calling)           │  │
│        └────────────┘      │                               │  │     │                    │  │
│   Redux store (single      │                               │  │     ▼                    │  │
│   source of truth for      │                               │  │  tools node              │  │
│   both panes)              │                               │  │  (5 tools, explicit      │  │
└────────────────────────────┘                               │  │   state mutation)        │  │
                                                               │  └────────────────────────┘  │
                                                               │           │                   │
                                                               │           ▼                   │
                                                               │   Postgres / MySQL             │
                                                               │   (interactions, HCPs,         │
                                                               │    materials)                  │
                                                               └─────────────────────────────┘
```

The **agent graph** is a standard LangGraph ReAct loop:

```
START → agent (Groq gemma2-9b-it, tools bound) 
          │
          ├─ tool_calls present → tools node → back to agent
          └─ no tool_calls        → END
```

The `tools` node executes each requested tool against a shared `AgentState`
(`form_data`, `missing_fields`, `suggested_followups`, `summary`,
`autofilled_fields`, `tool_trace`) explicitly in Python — so every state
mutation is easy to trace and debug (see `tool_trace` returned to the frontend).
A `MemorySaver` checkpointer keeps each rep's conversation (`session_id`)
isolated across turns.

## Design notes

The UI intentionally avoids the generic "AI app" look (cream + terracotta, or
black + neon). It uses a **clinical, trustworthy palette** (deep blue
`#2954A6` for primary actions, teal `#12B899` as the "AI" accent) because this
is a compliance-adjacent tool a field rep uses many times a day — it should
feel calm and precise, not flashy. The signature interaction is the **AI
autofill glow**: when the agent fills or edits a field, that field gets a
brief teal glow and an "AI" badge, so the rep always knows *what the
assistant just did* without re-reading the whole form. Inter is used
throughout per the brief, with weight (800/700/600/400) doing the work of
hierarchy instead of multiple typefaces.

## Running it locally

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env and set GROQ_API_KEY (create one at https://console.groq.com/keys)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed_data        # creates tables + demo HCPs/materials (SQLite by default)
uvicorn app.main:app --reload --port 8000
```

By default `DATABASE_URL` in `app/config.py` falls back to a local SQLite file
so the app runs with zero setup. To use Postgres or MySQL as specified in the
brief, set `DATABASE_URL` in `.env`, e.g.:

```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/hcp_crm
# or
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/hcp_crm
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

Open `http://localhost:5173`.

### 3. Try it

Type into the chat panel, e.g.:

> Met Dr. Ananya Sharma at AIIMS Delhi today at 3pm, discussed OncoBoost Phase
> III efficacy data, she seemed positive about switching her patients, shared
> the Phase III results deck and left 2 starter samples.

The agent will call `autofill_interaction`, populate the form fields on the
left (with the AI glow), then call `check_missing_information` and tell you
what's left. Ask "suggest follow-ups" or "summarize this" to trigger the
other two tools, or click the quick-action chips above the chat input.

## Project structure

```
hcp-crm-ai/
├── backend/
│   ├── app/
│   │   ├── agent/          # LangGraph state, prompts, tools, graph
│   │   ├── routers/        # /api/chat, /api/interactions, /api/hcps
│   │   ├── main.py, config.py, database.py, models.py, schemas.py
│   │   └── seed_data.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # StructuredForm, ChatAssistant, ChipField, MissingInfoBanner
│   │   ├── store/          # Redux slices (interaction, chat)
│   │   ├── api/client.js
│   │   ├── App.jsx, main.jsx, index.css
│   │   └── ...
│   └── package.json
└── docs/ARCHITECTURE.md
```

## Notes / assumptions

- SQLite is the zero-config default DB so reviewers can run the app without
  installing Postgres/MySQL first; swapping `DATABASE_URL` is a one-line change.
- Voice-note summarization ("Summarize from Voice Note") is included in the UI
  per the reference screenshot but left as a styled placeholder — no audio
  pipeline was in scope for this task.
- `gemma2-9b-it` is used for both the agent's routing/tool-calling and the
  tools' own follow-up LLM calls, per the task spec; `llama-3.3-70b-versatile`
  is wired in as an easy drop-in (`GROQ_FALLBACK_MODEL`) for heavier reasoning
  if needed.
