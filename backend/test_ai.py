"""
Quick end-to-end test for the Nova AI service.
Run from the backend/ directory with your venv activated:
  python test_ai.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "services"))

from services.ai_service import nova_ai

DUMMY_TICKET = (
    "Hi support, our enterprise checkout is completely broken. "
    "The POST /api/v1/checkout/process endpoint is returning a 500 error on every request. "
    "We cannot process any payments at all. This is urgent — we are losing thousands of dollars per minute."
)

print("=" * 60)
print("Nova AI Service — End-to-End Test")
print("=" * 60)

print("\n[1/2] Analyzing ticket with gemini-1.5-flash...")
result = nova_ai.analyze_ticket(DUMMY_TICKET)
print(f"  [OK] Category      : {result.category}")
print(f"  [OK] Urgency       : {result.urgency}")
print(f"  [OK] Sentiment     : {result.sentiment_score:.2f}")
print(f"  [OK] Summary       : {result.summary}")

print("\n[2/2] Generating vector embedding with Gemini text-embedding-004...")
embedding = nova_ai.generate_embedding(DUMMY_TICKET)
print(f"  [OK] Vector dims   : {len(embedding)}")
print(f"  [OK] First 5 floats: {[round(x, 6) for x in embedding[:5]]}")

print("\n" + "=" * 60)
print("All checks passed! Nova AI is operational.")
print("=" * 60)
