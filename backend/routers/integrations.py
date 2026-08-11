from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Ticket
from services.github_service import GitHubService
from services.ai_service import nova_ai

router = APIRouter(
    prefix="/api/integrations",
    tags=["integrations"]
)

class SyncRequest(BaseModel):
    repository: str  # e.g. "facebook/react"
    limit: int = 5

@router.post("/github/sync")
def sync_github_issues(request: SyncRequest, db: Session = Depends(get_db)):
    """
    Fetches issues from GitHub, processes them through the AI pipeline,
    and saves them to the database.
    """
    try:
        # 1. Fetch from GitHub REST API (public, no auth needed)
        issues = GitHubService.fetch_latest_issues(request.repository, limit=request.limit)

        if not issues:
            return {"message": "No issues found or repository invalid", "imported": 0}

        imported_count = 0

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
            imported_count += 1

        db.commit()
        return {"message": "Sync successful", "imported": imported_count}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
