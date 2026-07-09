"""
SQLAlchemy ORM models.
"""
import uuid
import datetime as dt

from sqlalchemy import Column, String, Text, DateTime, JSON
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class HCP(Base):
    __tablename__ = "hcps"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    specialty = Column(String(255), nullable=True)
    institution = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)


class Material(Base):
    __tablename__ = "materials"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="brochure")  # brochure, pdf, sample, video


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    hcp_name = Column(String(255), nullable=True)
    interaction_type = Column(String(50), default="Meeting")
    date = Column(String(20), nullable=True)
    time = Column(String(20), nullable=True)
    attendees = Column(JSON, default=list)
    topics_discussed = Column(Text, nullable=True)
    materials_shared = Column(JSON, default=list)
    samples_distributed = Column(JSON, default=list)
    sentiment = Column(String(20), default="Neutral")
    outcomes = Column(Text, nullable=True)
    follow_up_actions = Column(JSON, default=list)
    ai_suggested_followups = Column(JSON, default=list)
    summary = Column(Text, nullable=True)
    created_via = Column(String(20), default="form")  # form | chat | hybrid
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)
