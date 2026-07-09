import json
import re
from typing import Any, Dict, Tuple

from langchain_core.tools import tool
from langchain_groq import ChatGroq

from app.config import settings
from app.agent.prompts import EXTRACTION_PROMPT, FOLLOWUP_PROMPT, SUMMARY_PROMPT

REQUIRED_FIELDS = ["hcp_name", "interaction_type", "date", "topics_discussed", "sentiment"]

FIELD_LABELS = {
    "hcp_name": "HCP Name",
    "interaction_type": "Interaction Type",
    "date": "Date",
    "time": "Time",
    "attendees": "Attendees",
    "topics_discussed": "Topics Discussed",
    "materials_shared": "Materials Shared",
    "samples_distributed": "Samples Distributed",
    "sentiment": "Observed/Inferred HCP Sentiment",
    "outcomes": "Outcomes",
    "follow_up_actions": "Follow-up Actions",
}


def get_llm(temperature: float = 0.2) -> ChatGroq:
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=temperature,
    )


def _safe_json_object(text: str) -> Dict[str, Any]:
    """Best-effort extraction of a JSON object from an LLM response."""
    text = text.strip()
    text = re.sub(r"^```(json)?|```$", "", text, flags=re.MULTILINE).strip()
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def _safe_json_array(text: str) -> list:
    text = text.strip()
    text = re.sub(r"^```(json)?|```$", "", text, flags=re.MULTILINE).strip()
    match = re.search(r"\[.*\]", text, flags=re.DOTALL)
    if not match:
        return []
    try:
        val = json.loads(match.group(0))
        return val if isinstance(val, list) else []
    except json.JSONDecodeError:
        return []


# ---------------------------------------------------------------------------
# Tool schemas (bound to the LLM for function-calling; execution is manual)
# ---------------------------------------------------------------------------

@tool
def autofill_interaction(conversation_text: str) -> str:
    """Extract structured CRM fields (HCP name, interaction type, date, time,
    attendees, topics discussed, materials shared, samples distributed,
    sentiment, outcomes, follow-up actions) from the rep's free-text
    description of an interaction, and merge them into the form. Use this
    whenever the rep describes a new interaction or adds new prose detail."""
    return conversation_text


@tool
def update_interaction(field_name: str, new_value: str) -> str:
    """Update ONE specific existing field in the interaction form. field_name
    must be one of: hcp_name, interaction_type, date, time, attendees,
    topics_discussed, materials_shared, samples_distributed, sentiment,
    outcomes, follow_up_actions. new_value is the new value as plain text
    (comma-separate multiple items for list fields)."""
    return f"{field_name}={new_value}"


@tool
def check_missing_information() -> str:
    """Check the current form for required fields that are still empty
    (HCP name, interaction type, date, topics discussed, sentiment) and
    report which ones are missing so the rep can be prompted for them."""
    return "check"


@tool
def suggest_followups() -> str:
    """Generate 2-4 smart, prioritized follow-up actions / next steps based
    on the topics discussed, outcomes and sentiment already captured in the
    form."""
    return "suggest"


@tool
def generate_summary() -> str:
    """Generate a concise, professional summary paragraph of the interaction,
    suitable for the CRM record, based on the current form data."""
    return "summarize"


ALL_TOOLS = [
    autofill_interaction,
    update_interaction,
    check_missing_information,
    suggest_followups,
    generate_summary,
]


# ---------------------------------------------------------------------------
# Manual execution / state-mutation logic
# ---------------------------------------------------------------------------

def _merge_list_field(current: list, incoming) -> list:
    if isinstance(incoming, str):
        incoming = [x.strip() for x in incoming.split(",") if x.strip()]
    if not isinstance(incoming, list):
        return current
    merged = list(current or [])
    for item in incoming:
        if item and item not in merged:
            merged.append(item)
    return merged


LIST_FIELDS = {"attendees", "materials_shared", "samples_distributed", "follow_up_actions"}


def run_autofill_interaction(args: Dict[str, Any], state: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    conversation_text = args.get("conversation_text", "")
    llm = get_llm(temperature=0.1)
    prompt = EXTRACTION_PROMPT.format(
        current=json.dumps(state.get("form_data", {})), conversation=conversation_text
    )
    resp = llm.invoke(prompt)
    extracted = _safe_json_object(resp.content)

    form_data = dict(state.get("form_data", {}))
    changed = []
    for key, value in extracted.items():
        if key not in FIELD_LABELS or value in (None, "", []):
            continue
        if key in LIST_FIELDS:
            form_data[key] = _merge_list_field(form_data.get(key, []), value)
        else:
            form_data[key] = value
        changed.append(key)

    if not changed:
        return "No new structured fields could be confidently extracted from that.", {}

    labels = ", ".join(FIELD_LABELS[c] for c in changed)
    return f"Auto-filled: {labels}.", {
        "form_data": form_data,
        "autofilled_fields": changed,
    }


def run_update_interaction(args: Dict[str, Any], state: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    field = args.get("field_name", "")
    value = args.get("new_value", "")
    if field not in FIELD_LABELS:
        return f"'{field}' is not a recognized form field.", {}

    form_data = dict(state.get("form_data", {}))
    if field in LIST_FIELDS:
        form_data[field] = _merge_list_field([], value) if "," in value else _merge_list_field(
            form_data.get(field, []), value
        )
    else:
        form_data[field] = value

    return f"Updated {FIELD_LABELS[field]} to \"{value}\".", {
        "form_data": form_data,
        "autofilled_fields": [field],
    }


def run_check_missing_information(args: Dict[str, Any], state: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    form_data = state.get("form_data", {})
    missing = [f for f in REQUIRED_FIELDS if not form_data.get(f)]
    if missing:
        labels = ", ".join(FIELD_LABELS[f] for f in missing)
        msg = f"Still missing: {labels}."
    else:
        msg = "All required fields are complete."
    return msg, {"missing_fields": missing}


def run_suggest_followups(args: Dict[str, Any], state: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    form_data = state.get("form_data", {})
    llm = get_llm(temperature=0.4)
    prompt = FOLLOWUP_PROMPT.format(form=json.dumps(form_data))
    resp = llm.invoke(prompt)
    followups = _safe_json_array(resp.content)
    if not followups:
        return "Not enough detail yet to suggest follow-ups.", {}
    return f"Suggested {len(followups)} follow-up action(s).", {"suggested_followups": followups}


def run_generate_summary(args: Dict[str, Any], state: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    form_data = state.get("form_data", {})
    llm = get_llm(temperature=0.3)
    prompt = SUMMARY_PROMPT.format(form=json.dumps(form_data))
    resp = llm.invoke(prompt)
    summary = resp.content.strip()
    return "Summary generated.", {"summary": summary}


DISPATCH = {
    "autofill_interaction": run_autofill_interaction,
    "update_interaction": run_update_interaction,
    "check_missing_information": run_check_missing_information,
    "suggest_followups": run_suggest_followups,
    "generate_summary": run_generate_summary,
}


def dispatch_tool_call(name: str, args: Dict[str, Any], state: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    handler = DISPATCH.get(name)
    if handler is None:
        return f"Unknown tool '{name}'.", {}
    try:
        return handler(args, state)
    except Exception as exc:  # noqa: BLE001
        return f"Tool '{name}' failed: {exc}", {}
