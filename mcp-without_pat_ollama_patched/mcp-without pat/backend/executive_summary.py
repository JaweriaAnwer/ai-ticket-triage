"""Executive Summary generation for the standalone Tableau dashboard extension.

This module is completely separate from the chatbot (backend/chat.py,
backend/local_chat.py) and is never imported by them. It powers only the new
`/api/executive-summary` route used by the independent Executive Summary
.trex extension.

Design: rather than asking the (often small, local Ollama) model to eyeball a
CSV dump and compute trends/comparisons itself — which local models do
unreliably — we precompute concrete numeric facts in plain Python (period
trends, best/worst category comparisons, statistical outliers) across every
worksheet on the dashboard, then ask the model only to turn those verified
facts into a short list of business-framed insights with a mandatory
POSITIVE/NEGATIVE marker on every line (rendered downstream as a green or red
indicator — there is no neutral/unmarked state). This keeps the numbers
trustworthy and lets the model focus on the part it's actually good at:
business phrasing and judgment. Because small local models (this is tuned
against qwen3:1.7b via Ollama) are also unreliable about *following output
formatting instructions* — not just about arithmetic — the parsing step below
is defensive: it strips any leaked <think>...</think> reasoning block and
falls back to a keyword-based classifier for any line the model leaves
unmarked, so every insight is guaranteed a color either way.
"""
from __future__ import annotations

import csv as csv_module
import io
import re
import statistics
from dataclasses import dataclass
from typing import Any, Optional

from openai import OpenAI

from backend.config import env


# ---------------------------------------------------------------------------
# CSV parsing — intentionally local (not imported from local_chat.py) so the
# chatbot module never has to change to support this feature.
# ---------------------------------------------------------------------------
def _read_csv_table(csv_text: str) -> tuple[list[str], list[dict[str, str]]]:
    reader = csv_module.reader(io.StringIO(csv_text))
    rows_raw = list(reader)
    if not rows_raw:
        return [], []
    header = [h.strip() for h in rows_raw[0]]
    out: list[dict[str, str]] = []
    for r in rows_raw[1:]:
        if not r:
            continue
        out.append({header[i]: (r[i] if i < len(r) else "") for i in range(len(header))})
    return header, out


def _to_number(v: Any) -> Optional[float]:
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    neg = s.startswith("(") and s.endswith(")")
    core = s.strip("()").replace(",", "").replace("$", "").replace("%", "").strip()
    if not core:
        return None
    try:
        n = float(core)
    except (ValueError, TypeError):
        return None
    return -n if neg else n


# ---------------------------------------------------------------------------
# Lightweight "is this a time period?" detection — good enough for common
# Tableau field shapes (years, ISO dates, "Jan 2024", "Q1 2024", ...) without
# pulling in a date-parsing dependency.
# ---------------------------------------------------------------------------
_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}
_YEAR_RE = re.compile(r"^(?:19|20)\d{2}$")
_YM_RE = re.compile(r"^((?:19|20)\d{2})[-/](\d{1,2})$")
_MY_RE = re.compile(r"^([A-Za-z]{3,9})[\s\-]+((?:19|20)\d{2})$")
_YMD_RE = re.compile(r"^((?:19|20)\d{2})[-/](\d{1,2})[-/](\d{1,2})$")
_MDY_RE = re.compile(r"^(\d{1,2})[/\-](\d{1,2})[/\-]((?:19|20)\d{2})$")
_Q_YEAR_RE = re.compile(r"^Q([1-4])[\s\-]*((?:19|20)\d{2})$", re.IGNORECASE)
_YEAR_Q_RE = re.compile(r"^((?:19|20)\d{2})[\s\-]*Q([1-4])$", re.IGNORECASE)


def _time_sort_key(value: str) -> Optional[tuple]:
    """Best-effort chronological sort key for a dimension value; None if not time-like."""
    s = value.strip()
    if not s:
        return None
    if _YEAR_RE.match(s):
        return (int(s), 0, 0)
    m = _YM_RE.match(s)
    if m:
        return (int(m.group(1)), int(m.group(2)), 0)
    m = _MY_RE.match(s)
    if m and m.group(1).lower() in _MONTHS:
        return (int(m.group(2)), _MONTHS[m.group(1).lower()], 0)
    m = _YMD_RE.match(s)
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    m = _MDY_RE.match(s)
    if m:
        return (int(m.group(3)), int(m.group(1)), int(m.group(2)))
    m = _Q_YEAR_RE.match(s)
    if m:
        return (int(m.group(2)), int(m.group(1)) * 3, 0)
    m = _YEAR_Q_RE.match(s)
    if m:
        return (int(m.group(1)), int(m.group(2)) * 3, 0)
    low = s.lower()
    if low in _MONTHS:
        return (0, _MONTHS[low], 0)
    return None


def _classify_columns(columns: list[str], rows: list[dict[str, str]]) -> tuple[list[str], list[str]]:
    """Split columns into (measures, dimensions) using a majority-numeric heuristic.

    Year-like/date-like columns (e.g. 2022, 2023, 2024) are numeric-parseable
    but identify a time period, not a quantity to sum — they're classified as
    dimensions so they stay eligible for time-trend detection instead of
    being nonsensically summed as a "measure".
    """
    measures: list[str] = []
    dimensions: list[str] = []
    for col in columns:
        values = [r.get(col, "") for r in rows]
        non_empty = [v for v in values if str(v).strip()]
        if not non_empty:
            dimensions.append(col)
            continue
        time_like = sum(1 for v in non_empty if _time_sort_key(str(v)) is not None)
        if time_like / len(non_empty) >= 0.8:
            dimensions.append(col)
            continue
        numeric = [v for v in non_empty if _to_number(v) is not None]
        if len(numeric) / len(non_empty) >= 0.7:
            measures.append(col)
        else:
            dimensions.append(col)
    return measures, dimensions


def _pick_time_dimension(dimensions: list[str], rows: list[dict[str, str]]) -> Optional[str]:
    best: Optional[str] = None
    best_score = 0.0
    for col in dimensions:
        sample = [str(r.get(col, "")) for r in rows if str(r.get(col, "")).strip()][:60]
        if not sample:
            continue
        time_like = sum(1 for v in sample if _time_sort_key(v) is not None)
        ratio = time_like / len(sample)
        if ratio < 0.6:
            continue
        name_hint = any(k in col.lower() for k in ("year", "date", "month", "quarter", "period", "week"))
        score = ratio + (0.25 if name_hint else 0)
        if score > best_score:
            best = col
            best_score = score
    return best


# ---------------------------------------------------------------------------
# Precomputed facts
# ---------------------------------------------------------------------------
@dataclass
class TrendFact:
    worksheet: str
    measure: str
    time_field: str
    first_period: str
    first_value: float
    last_period: str
    last_value: float
    pct_change: Optional[float]
    kind: str = "sum"  # "sum" (revenue, units, ...) or "avg" (rate/score-style measures)
    biggest_step_period: Optional[str] = None
    biggest_step_pct: Optional[float] = None


@dataclass
class CategoryFact:
    worksheet: str
    measure: str
    dimension: str
    top_label: str
    top_value: float
    bottom_label: str
    bottom_value: float
    total: float
    kind: str = "sum"


@dataclass
class AnomalyFact:
    worksheet: str
    measure: str
    label: str
    value: float
    mean: float


_RATE_NAME_RE = re.compile(r"(rate|percent|pct|ratio|margin|score|avg|average|mean|share|index)", re.IGNORECASE)


def _measure_agg_kind(measure_col: str, rows: list[dict[str, str]]) -> str:
    """"sum" for additive quantities (revenue, units, counts), "avg" for rate/
    percentage-style measures (churn rate, satisfaction score, margin, ...)
    where summing across categories would produce a meaningless total."""
    if _RATE_NAME_RE.search(measure_col):
        return "avg"
    sample = [str(r.get(measure_col, "")) for r in rows[:30] if str(r.get(measure_col, "")).strip()]
    if sample and sum(1 for v in sample if "%" in v) / len(sample) >= 0.5:
        return "avg"
    return "sum"


def _aggregate_by(
    rows: list[dict[str, str]], group_col: str, measure_col: str, agg: str = "sum"
) -> list[tuple[str, float]]:
    sums: dict[str, float] = {}
    counts: dict[str, int] = {}
    for r in rows:
        key = str(r.get(group_col, "")).strip()
        if not key:
            continue
        val = _to_number(r.get(measure_col))
        if val is None:
            continue
        sums[key] = sums.get(key, 0.0) + val
        counts[key] = counts.get(key, 0) + 1
    if agg == "avg":
        return [(k, sums[k] / counts[k]) for k in sums]
    return list(sums.items())


MAX_MEASURES_PER_SHEET = 4
MAX_CATEGORY_DIMS_PER_SHEET = 3
MAX_CATEGORY_CARDINALITY = 30
MIN_CATEGORY_CARDINALITY = 2


def _worksheet_facts(
    worksheet_name: str,
    columns: list[str],
    rows: list[dict[str, str]],
) -> tuple[list[TrendFact], list[CategoryFact], list[AnomalyFact]]:
    trends: list[TrendFact] = []
    categories: list[CategoryFact] = []
    anomalies: list[AnomalyFact] = []
    if not rows or not columns:
        return trends, categories, anomalies

    measures, dimensions = _classify_columns(columns, rows)
    if not measures:
        return trends, categories, anomalies

    measures = measures[:MAX_MEASURES_PER_SHEET]
    time_col = _pick_time_dimension(dimensions, rows)
    category_dims = [d for d in dimensions if d != time_col]

    # --- Trends over the detected time dimension ---
    if time_col:
        for measure in measures:
            kind = _measure_agg_kind(measure, rows)
            pairs = _aggregate_by(rows, time_col, measure, agg=kind)
            keyed = [(p, v, _time_sort_key(p)) for p, v in pairs]
            keyed = [k for k in keyed if k[2] is not None]
            if len(keyed) < 2:
                continue
            keyed.sort(key=lambda k: k[2])
            first_period, first_value, _ = keyed[0]
            last_period, last_value, _ = keyed[-1]
            pct = ((last_value - first_value) / abs(first_value)) * 100 if first_value else None
            biggest_period = None
            biggest_pct = None
            for i in range(1, len(keyed)):
                prev_v = keyed[i - 1][1]
                cur_v = keyed[i][1]
                if not prev_v:
                    continue
                step_pct = ((cur_v - prev_v) / abs(prev_v)) * 100
                if biggest_pct is None or abs(step_pct) > abs(biggest_pct):
                    biggest_pct = step_pct
                    biggest_period = keyed[i][0]
            trends.append(
                TrendFact(
                    worksheet=worksheet_name,
                    measure=measure,
                    time_field=time_col,
                    first_period=first_period,
                    first_value=round(first_value, 2),
                    last_period=last_period,
                    last_value=round(last_value, 2),
                    pct_change=round(pct, 1) if pct is not None else None,
                    kind=kind,
                    biggest_step_period=biggest_period,
                    biggest_step_pct=round(biggest_pct, 1) if biggest_pct is not None else None,
                )
            )

    # --- Category comparisons (best vs worst performer) ---
    scored_dims: list[tuple[str, int]] = []
    for d in category_dims:
        distinct = {str(r.get(d, "")).strip() for r in rows if str(r.get(d, "")).strip()}
        n = len(distinct)
        if MIN_CATEGORY_CARDINALITY <= n <= MAX_CATEGORY_CARDINALITY:
            scored_dims.append((d, n))
    scored_dims.sort(key=lambda x: x[1])  # prefer cleaner, lower-cardinality categories first
    scored_dims = scored_dims[:MAX_CATEGORY_DIMS_PER_SHEET]

    for d, _n in scored_dims:
        for measure in measures:
            kind = _measure_agg_kind(measure, rows)
            pairs = _aggregate_by(rows, d, measure, agg=kind)
            if len(pairs) < 2:
                continue
            pairs.sort(key=lambda p: p[1], reverse=True)
            top_label, top_value = pairs[0]
            bottom_label, bottom_value = pairs[-1]
            if top_label == bottom_label:
                continue
            total = sum(v for _, v in pairs)
            categories.append(
                CategoryFact(
                    worksheet=worksheet_name,
                    measure=measure,
                    dimension=d,
                    top_label=top_label,
                    top_value=round(top_value, 2),
                    bottom_label=bottom_label,
                    bottom_value=round(bottom_value, 2),
                    total=round(total, 2),
                    kind=kind,
                )
            )

    # --- Row-level anomalies (values far from the mean) ---
    label_col = category_dims[0] if category_dims else (dimensions[0] if dimensions else None)
    for measure in measures:
        values = [_to_number(r.get(measure)) for r in rows]
        values = [v for v in values if v is not None]
        if len(values) < 6:
            continue
        try:
            mean = statistics.mean(values)
            stdev = statistics.pstdev(values)
        except statistics.StatisticsError:
            continue
        if not stdev:
            continue
        found = 0
        for r in rows:
            v = _to_number(r.get(measure))
            if v is None:
                continue
            z = (v - mean) / stdev
            if abs(z) >= 2.5:
                label = str(r.get(label_col, "")).strip() if label_col else ""
                anomalies.append(
                    AnomalyFact(
                        worksheet=worksheet_name,
                        measure=measure,
                        label=label or "(row)",
                        value=round(v, 2),
                        mean=round(mean, 2),
                    )
                )
                found += 1
                if found >= 2:
                    break

    return trends, categories, anomalies


# ---------------------------------------------------------------------------
# Prompt assembly
# ---------------------------------------------------------------------------
MAX_WORKSHEETS = 12
MAX_TREND_FACTS = 14
MAX_CATEGORY_FACTS = 14
MAX_ANOMALY_FACTS = 8


def _format_facts_block(
    trends: list[TrendFact],
    categories: list[CategoryFact],
    anomalies: list[AnomalyFact],
) -> str:
    lines: list[str] = []
    if trends:
        lines.append("TRENDS OVER TIME:")
        for t in trends[:MAX_TREND_FACTS]:
            change = f"{t.pct_change:+.1f}%" if t.pct_change is not None else "change not computable"
            step = (
                f"; sharpest single-period move at {t.biggest_step_period} ({t.biggest_step_pct:+.1f}%)"
                if t.biggest_step_period and t.biggest_step_pct is not None
                else ""
            )
            agg_label = "average" if t.kind == "avg" else "total"
            lines.append(
                f"- [{t.worksheet}] {agg_label} {t.measure} by {t.time_field}: "
                f"{t.first_period}={t.first_value} -> {t.last_period}={t.last_value} ({change}){step}"
            )
    if categories:
        lines.append("\nCATEGORY COMPARISONS (best vs worst):")
        for c in categories[:MAX_CATEGORY_FACTS]:
            agg_label = "average" if c.kind == "avg" else "total"
            share = (
                f", top is {(c.top_value / c.total * 100):.0f}% of total"
                if c.kind == "sum" and c.total
                else ""
            )
            lines.append(
                f"- [{c.worksheet}] {agg_label} {c.measure} by {c.dimension}: "
                f"top={c.top_label} ({c.top_value}), bottom={c.bottom_label} ({c.bottom_value}){share}"
            )
    if anomalies:
        lines.append("\nPOSSIBLE ANOMALIES (row values far from the average):")
        for a in anomalies[:MAX_ANOMALY_FACTS]:
            lines.append(f"- [{a.worksheet}] {a.measure}: {a.label} = {a.value} (average is {a.mean})")
    if not lines:
        return "No reliable numeric trends, category comparisons, or anomalies could be computed from the attached data."
    return "\n".join(lines)


def _format_sheet_legend(parsed_sheets: list[dict[str, Any]]) -> str:
    lines = []
    for t in parsed_sheets:
        cols = ", ".join(t["columns"]) if t["columns"] else "(no columns)"
        filt = f"; filters = {t['filters']}" if t.get("filters") else ""
        lines.append(f"- {t['name']}: columns = {cols}{filt}")
    return "\n".join(lines)


SUMMARY_SYSTEM_PROMPT = """You are a senior business intelligence analyst writing an executive summary \
for a Tableau dashboard. You are given precomputed numeric facts (trends, category comparisons, and \
anomalies) drawn from every worksheet on the dashboard, plus a legend of each worksheet's columns.

Write 5 to 8 concise executive insights about the dashboard AS A WHOLE — never describe one chart at a \
time or narrate what a visualization shows. Focus on what changed, what is strong, what is weak, and why \
it matters to the business.

Rules:
1. Compare across categories, time periods, regions, products, departments, or any other dimension \
   present in the facts — call out increases, decreases, best performers, worst performers, trends, and \
   anomalies.
2. Do not repeat the same underlying insight more than once, even if it could be phrased from two \
   different worksheets or measures.
3. Every insight must be a specific claim grounded in the numbers you were given (or a ratio/percentage \
   derived from them) — never a vague statement like "sales look good."
4. For every insight, decide whether it is a genuine business improvement or a genuine business decline, \
   then start the line with exactly one marker:
   - "POSITIVE: " if it is a positive outcome for the business (e.g. revenue, profit, satisfaction, or \
     retention rising; cost, churn, or complaints falling).
   - "NEGATIVE: " if it is a negative outcome for the business (e.g. revenue or retention falling; churn, \
     cost, or complaints rising).
   EVERY line must start with one of these two markers. There is no neutral option and no third choice — \
   do not leave a line unmarked. Do not assume a rising number is always good or a falling number is \
   always bad — reason about what the metric name means for the business first. If the direction is \
   genuinely unclear, still make your best judgment call rather than omitting the marker.
5. Never use bullet characters, numbering, dashes, circles, arrows, or emojis of any kind. The ONLY thing \
   allowed at the start of a line is "POSITIVE: " or "NEGATIVE: ".
6. Output ONLY the insight lines, one per line, nothing else — no heading, no preamble, no closing \
   summary sentence, no markdown, no <think> reasoning block."""


def _build_user_prompt(
    dashboard_name: Optional[str],
    workbook_name: Optional[str],
    legend: str,
    facts_block: str,
) -> str:
    parts: list[str] = []
    label = dashboard_name or workbook_name
    if label:
        parts.append(f"Dashboard: {label}")
    parts.append("Worksheets on this dashboard:\n" + legend)
    parts.append("Computed facts (use these numbers; do not invent others):\n" + facts_block)
    parts.append("Write the executive insights now, following all rules exactly.")
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Output parsing
# ---------------------------------------------------------------------------
# Strips a leading generic bullet/numbering marker only (dashes, bullet
# glyphs, or short "1. " / "2) " style numbering) — never touches the
# POSITIVE:/NEGATIVE: markers, and never eats a leading year like "2024
# revenue..." (numbering match is capped at 2 digits and requires a
# trailing ". " / ") ").
_LEADING_MARK_RE = re.compile(r"^(?:[\-\*•●◦‣⁃]+\s*|\d{1,2}[\.\)]\s+)")

# Primary markers the model is instructed to use.
_POSITIVE_MARKER_RE = re.compile(r"^(?:POSITIVE|GOOD)\s*[:\-–—]\s*", re.IGNORECASE)
_NEGATIVE_MARKER_RE = re.compile(r"^(?:NEGATIVE|BAD)\s*[:\-–—]\s*", re.IGNORECASE)

# Some models emit these older unicode markers despite the instructions —
# keep recognizing them so an otherwise-well-formed line isn't sent to the
# (noisier) text-based fallback below.
_UP_MARKS = ("▲", "↑", "🔼")
_DOWN_MARKS = ("▼", "↓", "🔽")

# Qwen3 (and other "hybrid thinking" models served through Ollama) can prepend
# a <think>...</think> reasoning block before the actual answer even when not
# explicitly asked to reason — strip it so it never gets parsed as insight
# lines.
_THINK_BLOCK_RE = re.compile(r"<think>.*?</think>", re.IGNORECASE | re.DOTALL)

# Fallback classifier — only used for a line the model left unmarked, so a
# small/uncooperative local model still can't produce an uncolored line.
_BAD_WHEN_UP_RE = re.compile(
    r"\b(churn|cost|costs|expense|expenses|complaint|complaints|defect|defects|"
    r"refund|refunds|delay|delays|downtime|error|errors|attrition|turnover|"
    r"cancellation|cancellations|no-show|no-shows|return rate|ticket|tickets|"
    r"outage|outages|bounce rate|bounce)\b",
    re.IGNORECASE,
)
_INCREASE_WORD_RE = re.compile(
    r"\b(grew|grow|growth|rose|rising|rise[sd]?|increased|increase[sd]?|improved|"
    r"improvement|higher|gain(?:ed)?|surge[d]?|jump(?:ed)?|expand(?:ed)?|up|"
    r"climb(?:ed|ing)?|soar(?:ed|ing)?|spike[ds]?|accelerat\w*|"
    r"leads?|leading|highest|top|best|outperform\w*)\b",
    re.IGNORECASE,
)
_DECREASE_WORD_RE = re.compile(
    r"\b(fell|fall(?:ing)?|declin\w*|decreased|decrease[sd]?|dropped|drop(?:ped)?|"
    r"down|lower|lost|loss(?:es)?|shrink\w*|slump\w*|plunge\w*|contract\w*|"
    r"slip(?:ped|ping)?|sank|sunk|plummet\w*|eased?|cooled?|decelerat\w*|"
    r"lags?|lagging|lowest|bottom|worst|underperform\w*)\b",
    re.IGNORECASE,
)
_SIGNED_NUMBER_RE = re.compile(r"([+-])\d")


def _strip_reasoning(text: str) -> str:
    return _THINK_BLOCK_RE.sub("", text).strip()


def _fallback_indicator(text: str) -> str:
    """Best-effort positive/negative guess for a line the model left unmarked.

    Only reached when the model didn't follow the POSITIVE:/NEGATIVE:
    instruction, so it doesn't need to be perfect — it just needs to
    guarantee every insight still ends up green or red instead of uncolored.
    """
    bad_metric = bool(_BAD_WHEN_UP_RE.search(text))
    went_up = bool(_INCREASE_WORD_RE.search(text))
    went_down = bool(_DECREASE_WORD_RE.search(text))
    if not went_up and not went_down:
        m = _SIGNED_NUMBER_RE.search(text)
        if m:
            went_up = m.group(1) == "+"
            went_down = m.group(1) == "-"
    if went_up and not went_down:
        return "down" if bad_metric else "up"
    if went_down and not went_up:
        return "up" if bad_metric else "down"
    # No usable signal either way — default to "down" so the line surfaces
    # for a human to double-check rather than silently reading as good news.
    return "down"


def _parse_insights(text: str) -> list[dict[str, str]]:
    insights: list[dict[str, str]] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        line = _LEADING_MARK_RE.sub("", line).strip()
        if not line:
            continue

        indicator: Optional[str] = None
        if _POSITIVE_MARKER_RE.match(line):
            indicator = "up"
            line = _POSITIVE_MARKER_RE.sub("", line).strip()
        elif _NEGATIVE_MARKER_RE.match(line):
            indicator = "down"
            line = _NEGATIVE_MARKER_RE.sub("", line).strip()
        elif line[:1] in _UP_MARKS:
            indicator = "up"
            line = line[1:].strip()
        elif line[:1] in _DOWN_MARKS:
            indicator = "down"
            line = line[1:].strip()

        if not line:
            continue

        if indicator is None:
            indicator = _fallback_indicator(line)

        insights.append(
            {
                "text": line,
                "indicator": indicator,  # "up" | "down" — never null
                "color": "green" if indicator == "up" else "red",
            }
        )
    return insights[:8]


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
@dataclass
class ExecutiveSummaryResult:
    insights: list[dict[str, str]]
    worksheet_count: int
    facts_found: bool


def generate_executive_summary(
    openai_client: OpenAI,
    dashboard_data: Optional[dict[str, Any]],
    *,
    dashboard_name: Optional[str] = None,
    workbook_name: Optional[str] = None,
) -> ExecutiveSummaryResult:
    tables: list[Any] = []
    if isinstance(dashboard_data, dict):
        raw_tables = dashboard_data.get("tables")
        if isinstance(raw_tables, list):
            tables = raw_tables

    all_trends: list[TrendFact] = []
    all_categories: list[CategoryFact] = []
    all_anomalies: list[AnomalyFact] = []
    parsed_sheets: list[dict[str, Any]] = []

    for t in tables[:MAX_WORKSHEETS]:
        if not isinstance(t, dict):
            continue
        name = str(t.get("worksheetName") or t.get("name") or "Sheet")
        filters = str(t.get("filters") or "")
        columns_raw = t.get("columns") or []
        columns = [str(c) for c in columns_raw] if isinstance(columns_raw, list) else []
        csv_text = t.get("csv")
        rows: list[dict[str, str]] = []
        if isinstance(csv_text, str) and csv_text.strip():
            cols_from_csv, rows = _read_csv_table(csv_text)
            if cols_from_csv:
                columns = cols_from_csv
        parsed_sheets.append({"name": name, "columns": columns, "filters": filters})
        if not rows:
            continue
        trends, categories, anomalies = _worksheet_facts(name, columns, rows)
        all_trends.extend(trends)
        all_categories.extend(categories)
        all_anomalies.extend(anomalies)

    facts_block = _format_facts_block(all_trends, all_categories, all_anomalies)
    legend = _format_sheet_legend(parsed_sheets) or "(no worksheets attached)"
    user_prompt = _build_user_prompt(dashboard_name, workbook_name, legend, facts_block)

    model = env("OPENAI_MODEL") or "gpt-4o-mini"
    if "qwen3" in model.lower():
        # Turns off Qwen3's hybrid-thinking mode for this turn. Without it,
        # small local Qwen3 models frequently emit a <think>...</think>
        # reasoning block before the real answer, which both wastes tokens
        # and — if it slipped past _strip_reasoning — would get parsed as
        # bogus insight lines.
        user_prompt += "\n\n/no_think"

    completion = openai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )
    text = (completion.choices[0].message.content or "").strip()
    text = _strip_reasoning(text)
    insights = _parse_insights(text)

    return ExecutiveSummaryResult(
        insights=insights,
        worksheet_count=len(parsed_sheets),
        facts_found=bool(all_trends or all_categories or all_anomalies),
    )