from typing import Annotated, TypedDict, List, Dict, Any
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    form_data: Dict[str, Any]
    autofilled_fields: List[str]
    missing_fields: List[str]
    suggested_followups: List[str]
    summary: str
    tool_trace: List[str]
