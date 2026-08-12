from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json
import os
import requests

from database import get_db
from models import Ticket
from services.github_service import GitHubService
from services.ai_service import nova_ai

router = APIRouter(
    prefix="/api/integrations",
    tags=["integrations"]
)

SETTINGS_FILE = "n8n_settings.json"

def get_n8n_webhook_url():
    # 1. Env var takes priority — survives redeploys, set once in Render dashboard.
    env_url = os.getenv("N8N_WEBHOOK_URL")
    if env_url:
        return env_url

    # 2. Fall back to the settings file (set via the /n8n/webhook POST endpoint).
    #    Note: on Render's free tier this file resets on every redeploy, so it's
    #    best treated as a temporary override rather than the primary source.
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f).get("n8n_webhook_url")
        except:
            pass
    return None

def set_n8n_webhook_url(url: str):
    data = {}
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
        except:
            pass
    data["n8n_webhook_url"] = url
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f)


def fire_n8n_webhook(ticket: Ticket):
    """
    Fires a single ticket's data to the configured n8n webhook URL, if any.
    Shared by both the GitHub sync flow and manual ticket creation (tickets.py)
    so every ticket entry-point notifies n8n the same way.
    Fails silently (logs only) so a down/misconfigured n8n instance never
    blocks ticket ingestion.
    """
    webhook_url = get_n8n_webhook_url()
    if not webhook_url:
        return False

    try:
        response = requests.post(webhook_url, json={
            "id": f"T-{ticket.id}",
            "summary": ticket.summary,
            "urgency": ticket.urgency,
            "category": ticket.category.value if hasattr(ticket.category, "value") else ticket.category,
            "sentiment_score": ticket.sentiment_score,
            "source": ticket.source,
            "status": ticket.status,
        }, timeout=3)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"Failed to trigger n8n webhook for ticket {ticket.id}: {e}")
        return False


class WebhookRequest(BaseModel):
    webhook_url: str

@router.get("/n8n/webhook")
def get_webhook():
    return {"webhook_url": get_n8n_webhook_url() or ""}

@router.post("/n8n/webhook")
def set_webhook(request: WebhookRequest):
    set_n8n_webhook_url(request.webhook_url)
    return {"message": "Saved"}

@router.post("/n8n/test")
def test_webhook():
    url = get_n8n_webhook_url()
    if not url:
        raise HTTPException(status_code=400, detail="Webhook URL not set")
    
    mock_ticket = {
        "id": "T-TEST",
        "summary": "This is a test ticket from Nova",
        "urgency": "high",
        "category": "bug",
        "sentiment_score": -0.85
    }
    try:
        response = requests.post(url, json=mock_ticket, timeout=5)
        response.raise_for_status()
        return {"message": "Success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SyncRequest(BaseModel):
    repository: str  # e.g. "facebook/react"
    limit: int = 5

@router.post("/github/sync")
def sync_github_issues(request: SyncRequest, db: Session = Depends(get_db)):
    """
    Fetches issues from GitHub, processes them through the AI pipeline,
    saves them to the database, and fires n8n webhooks.
    """
    try:
        # 1. Fetch from GitHub REST API (public, no auth needed)
        issues = GitHubService.fetch_latest_issues(request.repository, limit=request.limit)

        if not issues:
            return {"message": "No issues found or repository invalid", "imported": 0}

        new_tickets = []

        for issue in issues:
            raw_text = f"{issue['title']}\n\n{issue['body']}"

            # Skip if we already have this exact issue (by summary/title match)
            existing = db.query(Ticket).filter(Ticket.summary == issue["title"]).first()
            if existing:
                continue

            # 2. Analyze with Groq (Llama-3) — sync call on nova_ai singleton
            analysis = nova_ai.analyze_ticket(raw_text)

            # 3. Generate Embedding with Gemini — sync call on nova_ai singleton
            embedding = nova_ai.generate_embedding(raw_text)

            # 4. Persist to PostgreSQL + pgvector
            new_ticket = Ticket(
                source=f"GitHub ({request.repository})",
                reporter_name=issue["reporter"],
                reporter_email=f"{issue['reporter']}@users.noreply.github.com",
                summary=issue["title"],
                raw_content=raw_text,
                category=analysis.category.value,
                sentiment_score=analysis.sentiment_score,
                urgency=analysis.urgency.value,
                embedding=embedding,
                status="open"
            )
            db.add(new_ticket)
            new_tickets.append(new_ticket)

        db.commit()

        # Fire n8n webhooks for each newly-synced ticket
        for t in new_tickets:
            db.refresh(t)
            fire_n8n_webhook(t)

        return {"message": "Sync successful", "imported": len(new_tickets)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
