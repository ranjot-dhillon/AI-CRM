from fastapi import APIRouter
from langchain_core.messages import HumanMessage, AIMessage

from app.schemas import ChatRequest, ChatResponse
from app.agent.graph import agent_graph

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest):
    config = {"configurable": {"thread_id": req.session_id}}

    result = agent_graph.invoke(
        {
            "messages": [HumanMessage(content=req.message)],
            "form_data": req.form_data.model_dump(),
            "autofilled_fields": [],
            "missing_fields": [],
            "suggested_followups": [],
            "summary": "",
            "tool_trace": [],
        },
        config=config,
    )

    reply = ""
    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            reply = msg.content
            break

    return ChatResponse(
        assistant_reply=reply or "Got it.",
        form_data=result.get("form_data", {}),
        autofilled_fields=result.get("autofilled_fields", []),
        missing_fields=result.get("missing_fields", []),
        suggested_followups=result.get("suggested_followups", []),
        summary=result.get("summary", ""),
        tool_trace=result.get("tool_trace", []),
    )
