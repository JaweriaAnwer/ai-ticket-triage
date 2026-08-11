from pydantic import BaseModel, Field
from enum import Enum


class CategoryEnum(str, Enum):
    bug = "bug"
    feature = "feature"
    question = "question"
    spam = "spam"


class UrgencyEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TicketAnalysisResult(BaseModel):
    """Strict Pydantic schema for Gemini structured output.
    This maps directly to our database columns in the tickets table."""
    category: CategoryEnum = Field(description="The category of the engineering ticket.")
    sentiment_score: float = Field(
        description="A float from -1.0 (very negative) to 1.0 (very positive) representing the sentiment of the ticket.",
        ge=-1.0,
        le=1.0,
    )
    urgency: UrgencyEnum = Field(description="The urgency level of the ticket.")
    summary: str = Field(description="A concise one-sentence summary of the ticket's core issue.")
