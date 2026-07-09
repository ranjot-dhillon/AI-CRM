"""
CRUD for saved interactions (used by the "Save Interaction" button once the
rep is happy with the form, whether it was filled via the form or the chat).
"""
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Interaction
from app.schemas import InteractionCreate, InteractionOut

router = APIRouter(prefix="/api/interactions", tags=["interactions"])


def _to_out(row: Interaction) -> InteractionOut:
    return InteractionOut(
        id=row.id,
        hcp_name=row.hcp_name or "",
        interaction_type=row.interaction_type or "Meeting",
        date=row.date or "",
        time=row.time or "",
        attendees=row.attendees or [],
        topics_discussed=row.topics_discussed or "",
        materials_shared=row.materials_shared or [],
        samples_distributed=row.samples_distributed or [],
        sentiment=row.sentiment or "Neutral",
        outcomes=row.outcomes or "",
        follow_up_actions=row.follow_up_actions or [],
        ai_suggested_followups=row.ai_suggested_followups or [],
        summary=row.summary or "",
        created_via=row.created_via or "form",
        created_at=row.created_at.isoformat() if row.created_at else "",
        updated_at=row.updated_at.isoformat() if row.updated_at else "",
    )


@router.post("", response_model=InteractionOut)
def create_interaction(payload: InteractionCreate, db: Session = Depends(get_db)):
    row = Interaction(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("", response_model=list[InteractionOut])
def list_interactions(db: Session = Depends(get_db)):
    rows = db.query(Interaction).order_by(Interaction.created_at.desc()).all()
    return [_to_out(r) for r in rows]


@router.get("/{interaction_id}", response_model=InteractionOut)
def get_interaction(interaction_id: str, db: Session = Depends(get_db)):
    row = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return _to_out(row)
