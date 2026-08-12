# Tableau dashboard extension

This folder contains the **Tableau dashboard extension** manifest for MCP Chat.

## Local Desktop mode (no PAT / no site)

Use this when the workbook is open in **Tableau Desktop** on your PC and you do not want Tableau Server auth.

1. In `.env` set:
   - `OPENAI_API_KEY=...`
   - `TABLEAU_LOCAL_EXTENSION=1`
   - Leave Connected App / PAT / `TABLEAU_SITE_NAME` empty (or keep them unused while local mode is forced).
2. Build and run:

```bash
npm run build
npm run start
```

3. `TableauMcpChat.trex` already points at `http://localhost:8787/` for Desktop.
4. In Tableau Desktop: open your workbook → edit a dashboard → drag **Extension** → select `TableauMcpChat.trex`.

The extension reads the workbook name, datasources, and sheet **summary data** from the open dashboard (Extensions API). Chat uses OpenAI only — no Server, PAT, or site.

**Limits:** Answers come from visible sheet summary/underlying data (row caps). This is not live Viz Data Service against a published Server datasource.

## Server mode (Connected App or PAT)

When `TABLEAU_LOCAL_EXTENSION` is off and Connected App or PAT is configured:

1. Tableau loads your UI in an iframe from the plain URL in `.trex` (no query params).
2. On start, the app reads the workbook slug from the **dashboard URL** (same as `?contentUrl=...` in browser tests), e.g. `.../views/AccountsPayableAI-MCP/ExecutiveSummary` → `AccountsPayableAI-MCP`.
3. It calls `GET /api/workbooks/resolve?contentUrl=...` to get the workbook **LUID**.
4. If the Tableau Extensions API is available, it can also resolve by workbook name and cache the id per dashboard.
5. Chat requests include `selectedWorkbook` and `extensionMode: true` (MCP tools against Tableau Server).

**Do not** put `?contentUrl=OneWorkbook` in `.trex` — that hardcodes a single workbook. Use a plain URL; each dashboard is detected automatically.

## Setup (shared)

### 1. Build and run the server

```bash
npm run build
npm run start
```

API + UI: http://localhost:8787

### 2. Edit the manifest URL

In `TableauMcpChat.trex`, set `<source-location><url>` to where you host the app:

- **Local Tableau Desktop:** `http://localhost:8787/`
- **Tableau Server / Cloud:** `https://your-server.example.com/` (HTTPS required)

If the API is on a **different host** than the UI, set `VITE_API_BASE` when building:

```bash
VITE_API_BASE=https://api.example.com npm run build
```

### 3. Add to a dashboard

1. Open a workbook in Tableau Desktop or Server.
2. Edit a dashboard → drag **Extension** onto the canvas.
3. Choose **TableauMcpChat.trex** (this file).
4. Resize the extension zone; chat scopes to that workbook automatically.

## Test without Tableau (Server mode)

With the dev server running:

```
http://localhost:5173/?contentUrl=AccountsPayableAI-MCP
```

Same resolve path the extension uses on start (slug from dashboard URL).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Tableau Extensions API not available" | Open via dashboard extension, not a normal browser tab |
| Health not OK / wants Connected App | Set `TABLEAU_LOCAL_EXTENSION=1` and `OPENAI_API_KEY` for Desktop |
| "No workbook matched name=..." | Server mode: workbook name must match Tableau; check `/api/workbooks` |
| Extension blank on Server | Use HTTPS; add URL to Server safe list |
| API errors from extension | Set `VITE_API_BASE` if API is not same origin as UI |

## Executive Summary extension (separate from the chatbot)

`ExecutiveSummary.trex` is a second, independent dashboard extension. It shows only an auto-generated
executive summary (no chat, no chat history, no dashboard/workbook/datasource header text) and runs as its
own card alongside `TableauMcpChat.trex`. Both extensions read the same live dashboard data but are
otherwise fully separate: separate `.trex` id, separate page (`summary.html`), separate API route
(`/api/executive-summary`). The chatbot extension and its behavior are unchanged.

1. Build and run the server the same way as above (`npm run build && npm run start`).
2. In Tableau, edit a dashboard → drag **Extension** onto the canvas (a second time, alongside the chat
   extension if you're using both) → select `ExecutiveSummary.trex`.
3. The summary generates automatically as soon as the extension loads — both when the dashboard is opened
   with it already there, and the first time it's added to a dashboard. Use the small **Regenerate**
   button under the insights if you change dashboard filters and want it refreshed.
4. Uses the same `OPENAI_API_KEY` / `OPENAI_BASE_URL` (Ollama) configuration as the chatbot — no extra
   setup required if the chatbot is already configured.
