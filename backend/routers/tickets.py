from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
import datetime
import json

from database import get_db
from models import Ticket
from services.ai_service import nova_ai, groq_client, ANALYSIS_SYSTEM_PROMPT
from routers.integrations import fire_n8n_webhook

router = APIRouter(
    prefix="/api/tickets",
    tags=["tickets"]
)

class TicketCreate(BaseModel):
    source: str = "Manual Entry"
    reporter_name: str | None = None
    reporter_email: str | None = None
    raw_content: str

class TicketResponse(BaseModel):
    id: int
    source: str
    reporter_name: str | None
    reporter_email: str | None
    raw_content: str
    category: str | None
    sentiment_score: float | None
    urgency: str | None
    summary: str | None
    status: str
    created_at: datetime.datetime
    
    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=List[TicketResponse])
def get_tickets(q: str | None = None, db: Session = Depends(get_db)):
    """Retrieve all tickets, ordered by newest first. Optionally filter by search query."""
    stmt = select(Ticket).order_by(Ticket.created_at.desc())
    if q:
        search_term = f"%{q}%"
        stmt = stmt.filter(
            Ticket.raw_content.ilike(search_term) | Ticket.summary.ilike(search_term)
        )
    tickets = db.scalars(stmt).all()
    return tickets

@router.post("", response_model=TicketResponse)
def create_ticket(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    """
    Ingest a new ticket.
    Synchronously calls NovaAI to categorize and generate an embedding, 
    then saves everything to PostgreSQL.
    """
    # 1. Analyze with Groq (llama-3.3)
    analysis = nova_ai.analyze_ticket(ticket_data.raw_content)
    
    # 2. Embed with Gemini (text-embedding-004)
    embedding = nova_ai.generate_embedding(ticket_data.raw_content)
    
    # 3. Save to DB
    new_ticket = Ticket(
        source=ticket_data.source,
        reporter_name=ticket_data.reporter_name,
        reporter_email=ticket_data.reporter_email,
        raw_content=ticket_data.raw_content,
        category=analysis.category.value,
        sentiment_score=analysis.sentiment_score,
        urgency=analysis.urgency.value,
        summary=analysis.summary,
        status="open",
        embedding=embedding
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Notify n8n (if a webhook URL is configured) that a new ticket was ingested
    fire_n8n_webhook(new_ticket)

    return new_ticket

@router.get("/{ticket_id}/similar", response_model=List[TicketResponse])
def get_similar_tickets(ticket_id: int, db: Session = Depends(get_db)):
    """
    Find semantically similar tickets using pgvector's L2 distance operator (<->).
    """
    target = db.get(Ticket, ticket_id)
    if not target or not target.embedding:
        raise HTTPException(status_code=404, detail="Ticket or embedding not found")
        
    similar_tickets = db.scalars(
        select(Ticket)
        .filter(Ticket.id != ticket_id)
        .order_by(Ticket.embedding.l2_distance(target.embedding))
        .limit(3)
    ).all()
    
    return similar_tickets


@router.patch("/{ticket_id}/ignore")
def ignore_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """
    Mark a ticket as ignored. Removes it from the active inbox.
    """
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket.status = "ignored"
    db.commit()
    return {"message": f"Ticket T-{ticket_id} marked as ignored", "id": ticket_id}


@router.post("/{ticket_id}/draft-jira")
def draft_jira_issue(ticket_id: int, db: Session = Depends(get_db)):
    """
    Uses Groq (Llama-3) to generate a professional, structured Jira ticket
    from the raw ticket data including summary, description, steps to reproduce, and priority.
    """
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    JIRA_PROMPT = f"""
You are an expert software engineering manager. Based on the following support ticket, generate a professional Jira issue.

Ticket Data:
- Category: {ticket.category}
- Urgency: {ticket.urgency}
- Sentiment Score: {ticket.sentiment_score}
- Reporter: {ticket.reporter_name or 'Unknown'} ({ticket.reporter_email or 'Unknown'})
- Source: {ticket.source}
- Raw Content: {ticket.raw_content[:800]}

Respond ONLY with a valid JSON object — no markdown, no explanation, just the JSON:
{{
  "title": "concise, professional Jira issue title (max 10 words)",
  "priority": "Critical | High | Medium | Low",
  "issue_type": "Bug | Story | Task | Improvement",
  "description": "2-3 sentence technical description of the issue",
  "steps_to_reproduce": ["step 1", "step 2", "step 3"],
  "expected_behavior": "one sentence",
  "actual_behavior": "one sentence",
  "suggested_labels": ["label1", "label2"]
}}
"""

    completion = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": JIRA_PROMPT}],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    draft = json.loads(completion.choices[0].message.content)
    return draft
