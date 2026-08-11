from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Dict, Any

from database import get_db
from models import Ticket

router = APIRouter(
    prefix="/api/clusters",
    tags=["clusters"]
)

# Cosine distance threshold for cross-source clustering.
# Lower = stricter (more specific problem match required).
# GitHub tech bugs across different repos: 0.35-0.45 (broad tech similarity)
# TRULY same-problem across platforms: 0.15-0.30 (e.g., "payment failing" in Stripe + Intercom)
# We want only genuinely same-problem matches → use 0.30
SIMILARITY_THRESHOLD = 0.30

@router.get("")
def get_clusters(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Groups tickets by PROBLEM SIMILARITY across different sources.

    The key insight: the Inbox already has a source filter (VS Code, Next.js, etc).
    Clusters should reveal tickets from DIFFERENT platforms that describe the
    same underlying issue (e.g., an auth bug in Flask AND a similar auth bug
    reported manually, or a crash from Next.js AND from VS Code).

    Rules:
      - Two tickets from the EXACT SAME source are NEVER linked here (use Inbox filter for that).
      - Two tickets from DIFFERENT sources are linked if their embedding cosine
        distance < SIMILARITY_THRESHOLD (genuinely similar problem description).
      - Bidirectional: both must consider each other close neighbors.
      - Singleton clusters (< 2 members) are discarded.
    """
    tickets = db.scalars(
        select(Ticket)
        .filter(Ticket.embedding.is_not(None))
        .filter(Ticket.status != "ignored")
        .order_by(Ticket.created_at.desc())
    ).all()

    if len(tickets) < 2:
        return []

    ticket_map: Dict[int, Ticket] = {t.id: t for t in tickets}

    # For each ticket, find close neighbors from DIFFERENT sources only
    close_neighbors: Dict[int, set] = {t.id: set() for t in tickets}

    for ticket in tickets:
        candidates = db.execute(
            select(
                Ticket.id,
                Ticket.source,
                Ticket.embedding.cosine_distance(ticket.embedding).label("dist")
            )
            .filter(Ticket.id != ticket.id)
            .filter(Ticket.embedding.is_not(None))
            .filter(Ticket.status != "ignored")
            # KEY: exclude tickets from the same source — users filter those in Inbox
            .filter(Ticket.source != ticket.source)
            .order_by(Ticket.embedding.cosine_distance(ticket.embedding))
            .limit(5)
        ).all()

        for row in candidates:
            if row.dist is not None and row.dist < SIMILARITY_THRESHOLD:
                close_neighbors[ticket.id].add(row.id)

    # Only keep BIDIRECTIONAL edges (A→B AND B→A must both be true)
    edges: List[tuple] = []
    seen_pairs: set = set()
    for a_id, nbrs in close_neighbors.items():
        for b_id in nbrs:
            pair = tuple(sorted([a_id, b_id]))
            if pair not in seen_pairs:
                if a_id in close_neighbors.get(b_id, set()):
                    edges.append(pair)
                seen_pairs.add(pair)

    if not edges:
        return []

    # Union-Find on the validated cross-source edges
    parent = {t.id: t.id for t in tickets}

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int):
        parent[find(x)] = find(y)

    for a, b in edges:
        union(a, b)

    # Group by cluster root
    cluster_map: Dict[int, List[int]] = {}
    for t in tickets:
        root = find(t.id)
        cluster_map.setdefault(root, []).append(t.id)

    # Format clusters (2+ members only)
    results = []
    cluster_num = 1
    for root_id, member_ids in sorted(cluster_map.items(), key=lambda x: -len(x[1])):
        if len(member_ids) < 2:
            continue

        members = [ticket_map[mid] for mid in member_ids if mid in ticket_map]
        categories = [m.category for m in members if m.category]
        urgencies  = [m.urgency  for m in members if m.urgency]

        dominant_category = max(set(categories), key=categories.count) if categories else "unknown"
        dominant_urgency  = "high" if "high" in urgencies else (
            "medium" if "medium" in urgencies else "low"
        )

        first = members[0]
        label = first.summary or (first.raw_content[:60] + "...")

        results.append({
            "id": f"CLS-{cluster_num:03d}",
            "label": label,
            "dominant_category": dominant_category,
            "dominant_urgency": dominant_urgency,
            "ticket_count": len(members),
            "sources": list(set(m.source for m in members)),
            "tickets": [
                {
                    "id": m.id,
                    "summary": m.summary or m.raw_content[:60] + "...",
                    "category": m.category,
                    "urgency": m.urgency,
                    "source": m.source,
                    "reporter_name": m.reporter_name,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in sorted(members, key=lambda x: x.id)
            ],
        })
        cluster_num += 1

    return results
