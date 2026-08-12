"""OpenAI-only chat for local Tableau Desktop extension (no MCP / no Server auth)."""

from __future__ import annotations

import csv as csv_module
import io
import json
import time
from typing import Any

from openai import OpenAI

from backend.chat import AgentTurnResult, ToolStep, _build_turn_timing
from backend.config import env
from backend.datasources import SelectedDatasource
from backend.workbooks import SelectedWorkbook

LOCAL_ANALYST_SYSTEM = """You are a Tableau dashboard analyst running inside a local Desktop extension.
You answer ONLY from the dashboard sheet data provided in this conversation (summary tables from worksheets).
Rules:
1) Use only numbers and field names present in the provided tables.
2) If the data is insufficient, say what is missing — do not invent values.
3) Always state the filter context the numbers reflect. Each worksheet's data block lists
   "Filters currently applied" — check it before answering.
4) If the user asks about a specific year/period/category (e.g. "2024", "this region") and the
   relevant filter for that worksheet is NOT already narrowed to exactly that (e.g. it shows "All"
   or a different value), do NOT guess or sum across it. Call apply_worksheet_filter with the exact
   worksheetName and fieldName from the data block and the value(s) the user asked about. You will
   then receive re-read, correctly filtered data — answer from that.
4b) Some worksheet data blocks below are a PREVIEW (only the first several rows of a larger table,
    marked "PREVIEW ONLY"), or TRUNCATED FOR DISPLAY (marked "TRUNCATED"). NEVER compute totals,
    sums, counts, averages, or "how many" from rows you can see in either case — the visible rows
    are not the complete dataset and any math you do from them will be wrong. Whenever the user
    asks for a sum, average, count, min, max, or "how many/total", call summarize_worksheet_data —
    it computes the exact answer over the COMPLETE data, never truncated. Only read raw visible
    rows for things like "show me an example row" or eyeballing individual values, never for math.
5) Only call apply_worksheet_filter when the currently-applied value genuinely does not match what
   the user asked about. Don't call it if the filter already matches.
6) Do not claim access to Tableau Server, published datasources, or live queries.
7) Preserve currencies and units exactly as shown in the data."""

# Executed client-side (browser Extensions API) — the backend never touches the live dashboard
# itself. The frontend applies the filter, re-snapshots the affected worksheet, and resends the
# result as pending_filter_result so this module can finish the turn.
APPLY_FILTER_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "apply_worksheet_filter",
        "description": (
            "Change a categorical/date filter (e.g. Year) on a worksheet in the live Tableau "
            "dashboard, then re-read that worksheet's summary data. Use this whenever the user "
            "asks about a specific year/period/category and the worksheet's currently-applied "
            "filter value (shown in 'Filters currently applied') does not already match — instead "
            "of assuming an unfiltered or differently-filtered total answers their question."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "worksheetName": {
                    "type": "string",
                    "description": "Exact worksheet name as it appears in 'Worksheet: <name>' in the dashboard data, e.g. 'Revenue Trend'.",
                },
                "fieldName": {
                    "type": "string",
                    "description": "Exact filter field name as it appears in 'Filters currently applied', e.g. 'Year'.",
                },
                "values": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "The value(s) to select on this filter, e.g. ['2024']. Use exactly what the user asked about.",
                },
            },
            "required": ["worksheetName", "fieldName", "values"],
        },
    },
}

# Executed entirely server-side over the COMPLETE csv already present in dashboard_data for this
# request — no browser round trip needed, no row ever dropped. This is what math questions should
# use instead of the model eyeballing (possibly preview/truncated) raw rows.
SUMMARIZE_TOOL: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "summarize_worksheet_data",
        "description": (
            "Compute an exact aggregation (sum/avg/count/countd/min/max) over the COMPLETE data "
            "of a worksheet — never truncated, never a preview. Use this for ANY question involving "
            "a total, sum, average, count, min, max, or 'how many'. Optionally group by a field "
            "(e.g. Region) to get one result per group, and/or add simple equality filters on top "
            "of whatever the live dashboard filter already applied (e.g. Product = 'Widget A')."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "worksheetName": {
                    "type": "string",
                    "description": "Exact worksheet name as it appears in 'Worksheet: <name>'.",
                },
                "agg": {
                    "type": "string",
                    "enum": ["sum", "avg", "count", "countd", "min", "max"],
                    "description": "Aggregation function. countd = count of distinct values.",
                },
                "aggField": {
                    "type": "string",
                    "description": "Exact column name to aggregate, e.g. 'Sales'. Not needed for agg='count' of rows.",
                },
                "groupBy": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional column name(s) to group by, e.g. ['Region']. Omit for a single overall result.",
                },
                "filters": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "field": {"type": "string"},
                            "value": {"type": "string"},
                        },
                        "required": ["field", "value"],
                    },
                    "description": "Optional extra equality filters, e.g. [{\"field\": \"Region\", \"value\": \"West\"}].",
                },
            },
            "required": ["worksheetName", "agg"],
        },
    },
}

MAX_FILTER_ROUND_TRIPS = 3
MAX_LOCAL_TOOL_STEPS = 6  # server-side summarize_worksheet_data calls within one turn


def _read_csv_table(csv_text: str) -> tuple[list[str], list[dict[str, str]]]:
    """Parse the COMPLETE csv text into (columns, rows-as-dicts). Never truncates."""
    reader = csv_module.reader(io.StringIO(csv_text))
    rows_raw = list(reader)
    if not rows_raw:
        return [], []
    header = [h.strip() for h in rows_raw[0]]
    out: list[dict[str, str]] = []
    for r in rows_raw[1:]:
        if not r:
            continue
        d = {header[i]: (r[i] if i < len(r) else "") for i in range(len(header))}
        out.append(d)
    return header, out


def _to_number(v: str) -> float | None:
    try:
        return float(str(v).replace(",", "").replace("$", "").strip())
    except (ValueError, TypeError):
        return None


def _aggregate_rows(
    rows: list[dict[str, str]],
    agg: str,
    agg_field: str | None,
) -> Any:
    if agg == "count":
        return len(rows)
    if agg == "countd":
        if not agg_field:
            return None
        return len({r.get(agg_field) for r in rows})
    values = [_to_number(r.get(agg_field, "")) for r in rows] if agg_field else []
    values = [v for v in values if v is not None]
    if not values:
        return None
    if agg == "sum":
        return sum(values)
    if agg == "avg":
        return sum(values) / len(values)
    if agg == "min":
        return min(values)
    if agg == "max":
        return max(values)
    return None


def _execute_summarize_tool(args: dict[str, Any], dashboard_data: dict[str, Any] | None) -> str:
    worksheet_name = str(args.get("worksheetName") or "").strip()
    agg = str(args.get("agg") or "").strip().lower()
    agg_field = args.get("aggField")
    agg_field = str(agg_field).strip() if agg_field else None
    group_by = args.get("groupBy") or []
    if not isinstance(group_by, list):
        group_by = [group_by]
    extra_filters = args.get("filters") or []

    if not dashboard_data or not isinstance(dashboard_data, dict):
        return json.dumps({"error": "No dashboard data attached."})

    table = None
    for t in dashboard_data.get("tables") or []:
        if isinstance(t, dict) and str(t.get("worksheetName") or t.get("name") or "") == worksheet_name:
            table = t
            break
    if table is None:
        return json.dumps({"error": f"Worksheet '{worksheet_name}' not found in attached data."})

    csv_text = table.get("csv")
    if not isinstance(csv_text, str) or not csv_text.strip():
        return json.dumps({"error": f"Worksheet '{worksheet_name}' has no csv data attached."})

    columns, rows = _read_csv_table(csv_text)  # COMPLETE data, never truncated
    total_rows_before_filter = len(rows)

    for f in extra_filters:
        if not isinstance(f, dict):
            continue
        field, value = f.get("field"), f.get("value")
        if field is None or value is None:
            continue
        rows = [r for r in rows if str(r.get(field, "")).strip() == str(value).strip()]

    if agg not in ("sum", "avg", "count", "countd", "min", "max"):
        return json.dumps({"error": f"Unsupported agg '{agg}'."})
    if agg in ("sum", "avg", "min", "max", "countd") and not agg_field:
        return json.dumps({"error": f"agg='{agg}' requires aggField."})
    if agg_field and agg_field not in columns:
        return json.dumps({"error": f"aggField '{agg_field}' not in columns: {columns}"})
    for g in group_by:
        if g not in columns:
            return json.dumps({"error": f"groupBy field '{g}' not in columns: {columns}"})

    dashboard_filters = table.get("filters") or "(none)"

    if group_by:
        buckets: dict[tuple, list[dict[str, str]]] = {}
        for r in rows:
            key = tuple(r.get(g, "") for g in group_by)
            buckets.setdefault(key, []).append(r)
        result = [
            {**dict(zip(group_by, key)), "value": _aggregate_rows(bucket_rows, agg, agg_field)}
            for key, bucket_rows in buckets.items()
        ]
        result.sort(key=lambda d: (d["value"] is None, -(d["value"] or 0) if isinstance(d["value"], (int, float)) else 0))
    else:
        result = _aggregate_rows(rows, agg, agg_field)

    return json.dumps(
        {
            "worksheet": worksheet_name,
            "dashboardFilters": dashboard_filters,
            "extraFiltersApplied": extra_filters,
            "agg": agg,
            "aggField": agg_field,
            "groupBy": group_by,
            "rowsBeforeExtraFilters": total_rows_before_filter,
            "rowsAfterExtraFilters": len(rows),
            "result": result,
        }
    )


def _format_dashboard_data_block(
    dashboard_data: dict[str, Any] | None,
    *,
    preview_only: bool = False,
    preview_rows: int = 15,
) -> str:
    if not dashboard_data or not isinstance(dashboard_data, dict):
        return "No sheet data was attached. Ask the user to reload the extension inside Tableau Desktop."

    parts: list[str] = []
    tables = dashboard_data.get("tables")
    if isinstance(tables, list):
        for i, table in enumerate(tables):
            if not isinstance(table, dict):
                continue
            name = str(table.get("worksheetName") or table.get("name") or f"Sheet {i + 1}")
            columns = table.get("columns") or []
            rows = table.get("rows") or []
            csv = table.get("csv")
            parts.append(f"### Worksheet: {name}")
            if isinstance(columns, list) and columns:
                parts.append("Columns: " + ", ".join(str(c) for c in columns))
            filters = table.get("filters")
            if filters:
                parts.append(f"Filters currently applied: {filters}")
            else:
                parts.append(
                    "Filters currently applied: (none detected — treat any date/category "
                    "field not present as columns as unfiltered/spanning all its values)"
                )
            if isinstance(csv, str) and csv.strip():
                full_csv = csv.strip()
                if preview_only:
                    csv_lines = full_csv.split("\n")
                    total_data_rows = max(len(csv_lines) - 1, 0)
                    preview = "\n".join(csv_lines[: preview_rows + 1])  # header + N rows
                    parts.append("```csv\n" + preview[:8_000] + "\n```")
                    if total_data_rows > preview_rows:
                        parts.append(
                            f"(PREVIEW ONLY — showing {preview_rows} of {total_data_rows} rows. "
                            "Do not compute totals/sums/averages from this preview. If the user's "
                            "question needs a specific year/period/category, call "
                            "apply_worksheet_filter with that value FIRST, then answer from the "
                            "re-read, correctly filtered data you'll receive.)"
                        )
                else:
                    csv_lines = full_csv.split("\n")
                    total_data_rows = max(len(csv_lines) - 1, 0)
                    if len(full_csv) > 80_000:
                        # Loud truncation: shown rows are cut for DISPLAY only. Math must go
                        # through summarize_worksheet_data, which reads the complete csv_text
                        # straight from dashboard_data — never this truncated string.
                        shown = full_csv[:80_000]
                        shown_rows = max(shown.count("\n"), 0)
                        parts.append("```csv\n" + shown + "\n```")
                        parts.append(
                            f"(⚠️ TRUNCATED FOR DISPLAY — showing ~{shown_rows} of {total_data_rows} "
                            "rows. This excerpt is INCOMPLETE. Do NOT sum/count/average from it — "
                            "you will get the WRONG answer. Call summarize_worksheet_data for any "
                            "total, sum, average, count, or 'how many' — it uses the complete data.)"
                        )
                    else:
                        parts.append("```csv\n" + full_csv + "\n```")
            elif isinstance(rows, list) and rows:
                # Fallback: render rows as TSV
                if isinstance(columns, list) and columns:
                    header = "\t".join(str(c) for c in columns)
                    lines = [header]
                else:
                    lines = []
                for row in rows[:2000]:
                    if isinstance(row, (list, tuple)):
                        lines.append("\t".join(str(c) for c in row))
                    elif isinstance(row, dict):
                        lines.append("\t".join(str(v) for v in row.values()))
                parts.append("```tsv\n" + "\n".join(lines)[:80_000] + "\n```")
            note = table.get("note")
            if note:
                parts.append(f"Note: {note}")

    meta = dashboard_data.get("meta")
    if isinstance(meta, dict):
        truncated = meta.get("truncated")
        total_rows = meta.get("totalRows")
        if truncated or total_rows is not None:
            parts.append(
                f"(Snapshot meta: totalRows={total_rows}, truncated={bool(truncated)})"
            )

    if not parts:
        return "Dashboard data payload was empty."
    return "\n\n".join(parts)


def _build_local_system_prompt(
    selected_workbook: SelectedWorkbook | None,
    selected_datasources: list[SelectedDatasource] | None,
    dashboard_data: dict[str, Any] | None,
    *,
    dashboard_name: str | None = None,
    preview_only: bool = False,
) -> str:
    parts = [LOCAL_ANALYST_SYSTEM, "Active mode: local-extension."]
    if selected_workbook:
        parts.append(
            "Workbook (from open Tableau Desktop dashboard):\n"
            f"- name: {selected_workbook.name}"
        )
    if dashboard_name:
        parts.append(f"Dashboard name: {dashboard_name}")
    if selected_datasources:
        ds_lines = ["Datasources detected on this dashboard:"]
        for d in selected_datasources:
            pub = ""
            if d.is_published is True:
                pub = " (published)"
            elif d.is_published is False:
                pub = " (embedded/local)"
            ds_lines.append(f"- {d.name}{pub}")
        parts.append("\n".join(ds_lines))
    parts.append(
        "Dashboard sheet data:\n"
        + _format_dashboard_data_block(dashboard_data, preview_only=preview_only)
    )
    extra = env("CHAT_SYSTEM_EXTRA")
    if extra:
        parts.append(f"Deployment notes:\n{extra}")
    return "\n\n".join(parts)


def _message_to_dict(message: Any) -> dict[str, Any]:
    """Convert an OpenAI SDK message object to a plain JSON-safe dict for round-tripping."""
    if hasattr(message, "model_dump"):
        return message.model_dump(exclude_none=True)
    if isinstance(message, dict):
        return message
    return {"role": "assistant", "content": str(message)}


def run_local_extension_turn(
    openai_client: OpenAI,
    user_messages: list[dict[str, str]],
    selected_workbook: SelectedWorkbook | None = None,
    selected_datasources: list[SelectedDatasource] | None = None,
    dashboard_data: dict[str, Any] | None = None,
    *,
    dashboard_name: str | None = None,
    pending_filter_result: dict[str, Any] | None = None,
    filter_round_trip: int = 0,
) -> AgentTurnResult:
    """Run one local-extension chat turn.

    pending_filter_result, when present, carries the outcome of a filter change the
    frontend just performed on behalf of a previous apply_worksheet_filter tool call:
      {
        "assistantMessage": <raw assistant message dict that requested the tool call>,
        "toolCallId": "<id>",
        "resultContent": "<text describing the updated, re-filtered worksheet data>",
      }
    dashboard_data should be the FRESH snapshot taken after the filter was applied.
    """
    turn_start = time.time()
    setup_ms = 0
    open_ai_ms = 0
    steps: list[ToolStep] = []

    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": _build_local_system_prompt(
                selected_workbook,
                selected_datasources,
                dashboard_data,
                dashboard_name=dashboard_name,
                # Only send a full CSV once a filter round-trip has already narrowed the data.
                # On the first pass, a small preview is enough for the model to decide whether
                # it needs to call apply_worksheet_filter — this is what kills your response time.
                preview_only=(pending_filter_result is None),
            ),
        },
        *user_messages,
    ]

    if pending_filter_result:
        assistant_msg = pending_filter_result.get("assistantMessage") or {}
        tool_call_id = pending_filter_result.get("toolCallId")
        result_content = pending_filter_result.get("resultContent") or (
            "Filter applied. Updated, re-filtered worksheet data is attached above in "
            "'Dashboard sheet data'."
        )
        if assistant_msg and tool_call_id:
            messages.append(assistant_msg)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": result_content,
                }
            )
            steps.append(
                ToolStep(
                    tool="apply_worksheet_filter",
                    arguments={"toolCallId": tool_call_id},
                    result_preview="Filter applied on live dashboard; re-read worksheet data.",
                    duration_ms=0,
                )
            )

    model = env("OPENAI_MODEL") or "gpt-4o-mini"
    # Stop offering the filter tool once we've already round-tripped a few times this turn,
    # so a confused model can't loop forever changing filters back and forth.
    allow_filter_tool = filter_round_trip < MAX_FILTER_ROUND_TRIPS
    tools = ([APPLY_FILTER_TOOL] if allow_filter_tool else []) + [SUMMARIZE_TOOL]

    for _ in range(MAX_LOCAL_TOOL_STEPS):
        t_llm = time.time()
        completion = openai_client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        open_ai_ms += int((time.time() - t_llm) * 1000)
        choice = completion.choices[0]
        message = choice.message
        tool_calls = getattr(message, "tool_calls", None) or []

        filter_call = next(
            (tc for tc in tool_calls if getattr(tc.function, "name", "") == "apply_worksheet_filter"),
            None,
        )
        summarize_call = next(
            (tc for tc in tool_calls if getattr(tc.function, "name", "") == "summarize_worksheet_data"),
            None,
        )

        if filter_call is not None:
            # Needs the browser to actually change the live dashboard — hand back to the
            # frontend, same as before. We don't also process summarize_call in this branch
            # to keep the round trip simple; the model can call summarize again after refiltering.
            try:
                args = json.loads(filter_call.function.arguments or "{}")
            except (json.JSONDecodeError, TypeError):
                args = {}
            worksheet_name = str(args.get("worksheetName") or "").strip()
            field_name = str(args.get("fieldName") or "").strip()
            values = args.get("values") or []
            if not isinstance(values, list):
                values = [values]

            steps.append(
                ToolStep(
                    tool="apply_worksheet_filter",
                    arguments={"worksheetName": worksheet_name, "fieldName": field_name, "values": values},
                    result_preview="Requested the extension to change this filter on the live dashboard.",
                    duration_ms=0,
                )
            )
            timing = _build_turn_timing(turn_start, open_ai_ms, 0, setup_ms, steps)
            return AgentTurnResult(
                reply="",
                steps=steps,
                timing=timing,
                pending_filter={
                    "worksheetName": worksheet_name,
                    "fieldName": field_name,
                    "values": values,
                    "toolCallId": filter_call.id,
                    "assistantMessage": _message_to_dict(message),
                },
            )

        if summarize_call is not None:
            # Resolved entirely server-side, over the COMPLETE csv already in dashboard_data —
            # no browser round trip, and never subject to the display truncation above.
            try:
                args = json.loads(summarize_call.function.arguments or "{}")
            except (json.JSONDecodeError, TypeError):
                args = {}
            t0 = time.time()
            result_text = _execute_summarize_tool(args, dashboard_data)
            duration_ms = int((time.time() - t0) * 1000)
            steps.append(
                ToolStep(
                    tool="summarize_worksheet_data",
                    arguments=args,
                    result_preview=result_text[:2000],
                    duration_ms=duration_ms,
                    is_error='"error"' in result_text[:200],
                )
            )
            messages.append(_message_to_dict(message))
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": summarize_call.id,
                    "content": result_text,
                }
            )
            continue  # loop again so the model can answer using this exact result

        # No tool calls — final answer.
        text = (message.content or "").strip() if message else ""
        steps.append(
            ToolStep(
                tool="local-dashboard-snapshot",
                arguments={
                    "workbook": selected_workbook.name if selected_workbook else None,
                    "datasources": [d.name for d in (selected_datasources or [])],
                    "tableCount": len((dashboard_data or {}).get("tables") or [])
                    if isinstance(dashboard_data, dict)
                    else 0,
                },
                result_preview="Answered from Tableau Extensions API sheet summary data (no Server/PAT).",
                duration_ms=0,
            )
        )
        timing = _build_turn_timing(turn_start, open_ai_ms, 0, setup_ms, steps)
        return AgentTurnResult(reply=text or "(No text response)", steps=steps, timing=timing)

    timing = _build_turn_timing(turn_start, open_ai_ms, 0, setup_ms, steps)
    return AgentTurnResult(
        reply="Stopped after maximum tool steps. Try a narrower question.",
        steps=steps,
        timing=timing,
    )
