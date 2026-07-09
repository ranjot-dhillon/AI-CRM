from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class FormData(BaseModel):
    hcp_name: Optional[str] = ""
    interaction_type: Optional[str] = "Meeting"
    date: Optional[str] = ""
    time: Optional[str] = ""
    attendees: List[str] = Field(default_factory=list)
    topics_discussed: Optional[str] = ""
    materials_shared: List[str] = Field(default_factory=list)
    samples_distributed: List[str] = Field(default_factory=list)
    sentiment: Optional[str] = "Neutral"
    outcomes: Optional[str] = ""
    follow_up_actions: List[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    session_id: str
    message: str
    form_data: FormData


class ChatResponse(BaseModel):
    assistant_reply: str
    form_data: Dict[str, Any]
    autofilled_fields: List[str] = Field(default_factory=list)
    missing_fields: List[str] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    summary: Optional[str] = ""
    tool_trace: List[str] = Field(default_factory=list)


class InteractionCreate(FormData):
    ai_suggested_followups: List[str] = Field(default_factory=list)
    summary: Optional[str] = ""
    created_via: str = "form"


class InteractionOut(InteractionCreate):
    id: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True
