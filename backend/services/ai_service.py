"""
NovaAI Service — Groq + Google Gemini
======================================
Dual-provider AI architecture:
  - analyze_ticket()    → Groq (llama-3.3-70b-versatile) — ~500 tok/sec, 14k req/day free
  - generate_embedding()→ Google Gemini (text-embedding-004) — 768-dim, generous free quota
"""

import os
import json
from groq import Groq
from google import genai
from google.genai import types
from dotenv import load_dotenv
from schemas import TicketAnalysisResult

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in backend/.env")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in backend/.env")

# Initialize both clients
groq_client = Groq(api_key=GROQ_API_KEY)
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

ANALYSIS_SYSTEM_PROMPT = """
You are an expert AI assistant embedded inside Nova, an enterprise engineering triage platform.
Your job is to analyze raw support tickets and extract structured metadata.

Respond ONLY with a valid JSON object — no markdown, no explanation, just the JSON.
Follow this schema exactly:
{
  "category": one of ["bug", "feature", "question", "spam"],
  "sentiment_score": float from -1.0 (very frustrated) to 1.0 (very positive),
  "urgency": one of ["low", "medium", "high"],
  "summary": single sentence under 20 words summarizing the core issue
}

Rules:
- "bug": technical failure, crash, error, or unexpected behavior.
- "feature": request for new functionality or improvement.
- "question": general inquiry with no failure or feature ask.
- "spam": irrelevant, promotional, or nonsensical.
- urgency "high": production down, data loss, payments failing, or words like urgent/critical/ASAP.
- urgency "low": cosmetic, minor inconvenience, nice-to-have.
- urgency "medium": everything else.
"""


class NovaAI:
    def analyze_ticket(self, content: str) -> TicketAnalysisResult:
        """
        Classifies a ticket using Groq (llama-3.3-70b-versatile).
        Returns a validated TicketAnalysisResult Pydantic model.
        Typical latency: < 1 second.
        """
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": f"Analyze this ticket:\n\n---\n{content}\n---"},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        raw_json = completion.choices[0].message.content
        data = json.loads(raw_json)
        return TicketAnalysisResult(**data)

    def generate_embedding(self, content: str) -> list[float]:
        """
        Generates a 768-dim embedding using Google Gemini text-embedding-004.
        Stored in our pgvector column for semantic similarity and clustering.
        """
        result = gemini_client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=content,
        )
        return result.embeddings[0].values


# Singleton — import this across the app
nova_ai = NovaAI()
