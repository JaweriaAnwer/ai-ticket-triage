from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Dict, Any

from database import get_db
from models import Ticket

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"]
)

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """Get high-level KPIs."""
    total_tickets = db.query(func.count(Ticket.id)).scalar() or 0
    avg_sentiment = db.query(func.avg(Ticket.sentiment_score)).scalar() or 0.0
    high_urgency = db.query(func.count(Ticket.id)).filter(Ticket.urgency == "high").scalar() or 0
    
    return {
        "total_tickets": total_tickets,
        "avg_sentiment": float(avg_sentiment),
        "high_urgency_count": high_urgency
    }

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Group tickets by category."""
    results = db.query(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category).all()
    # Format for Recharts: [{name: "Bug", value: 45}, ...]
    data = []
    for category, count in results:
        cat_name = category.value if hasattr(category, "value") else str(category)
        if cat_name != "None":
            data.append({"name": cat_name.capitalize(), "value": count})
    return data

@router.get("/urgency")
def get_urgency(db: Session = Depends(get_db)):
    """Group tickets by urgency."""
    results = db.query(Ticket.urgency, func.count(Ticket.id)).group_by(Ticket.urgency).all()
    data = []
    for urgency, count in results:
        if urgency:
            data.append({"name": urgency.capitalize(), "value": count})
    return data

@router.get("/volume")
def get_volume(db: Session = Depends(get_db)):
    """Get ticket creation volume over time."""
    # Group by the date part of created_at
    results = db.query(
        func.date(Ticket.created_at).label('date'), 
        func.count(Ticket.id).label('count')
    ).group_by('date').order_by('date').all()
    
    data = [{"date": str(date), "count": count} for date, count in results]
    return data
