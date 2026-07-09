"""
LangGraph StateGraph wiring: agent (LLM w/ tool-calling) <-> tools, in a
standard ReAct-style loop, with explicit, debuggable state mutation.

Graph shape:

    START -> agent -> (tool_calls present?) -> tools -> agent -> ... -> END
                    -> (no tool calls)       -> END
"""
import json
from typing import Dict, Any

from langchain_core.messages import SystemMessage, ToolMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from app.agent.state import AgentState
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import ALL_TOOLS, dispatch_tool_call, get_llm

_llm_with_tools = get_llm(temperature=0.2).bind_tools(ALL_TOOLS)


def agent_node(state: AgentState) -> Dict[str, Any]:
    context = (
        f"\n\nCurrent form state (JSON): {json.dumps(state.get('form_data', {}))}\n"
        f"Missing required fields: {state.get('missing_fields', [])}\n"
    )
    system = SystemMessage(content=SYSTEM_PROMPT + context)
    response = _llm_with_tools.invoke([system, *state["messages"]])
    return {"messages": [response]}


def tools_router(state: AgentState) -> str:
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and getattr(last, "tool_calls", None):
        return "tools"
    return END


def tools_node(state: AgentState) -> Dict[str, Any]:
    last = state["messages"][-1]
    tool_messages = []
    merged_updates: Dict[str, Any] = {}
    trace = list(state.get("tool_trace", []))

    for call in last.tool_calls:
        name = call["name"]
        args = call.get("args", {}) or {}
        result_text, updates = dispatch_tool_call(name, args, {**state, **merged_updates})
        tool_messages.append(ToolMessage(content=result_text, tool_call_id=call["id"]))
        trace.append(f"{name}({json.dumps(args)}) -> {result_text}")
        for key, value in updates.items():
            merged_updates[key] = value

    return {"messages": tool_messages, "tool_trace": trace, **merged_updates}


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tools_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", tools_router, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")
    return graph.compile(checkpointer=MemorySaver())


# Compiled once at import time; reused across requests (in-memory checkpointer
# keyed by session/thread id keeps each rep's conversation isolated).
agent_graph = build_graph()
