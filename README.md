# Lattice

Quiet study desk for research-scientist interview prep (and any topic you add).

Modes: **Knowledge** (proactive agent MCQs), **Coding** (untimed strict Pyodide), **Discussion** (**in-app chat** with harness session config + tool hooks), **Journey** (struggle / quick-forget / confirmed).

## Local run

```bash
npm install
npm run dev          # http://127.0.0.1:4627  (PGlite when DATABASE_URL unset)
npm run build && npm run start
```

Requires Node 22+. First Coding run downloads Pyodide + numpy (CDN).

## Knowledge (proactive curriculum)

- On **topic load/select** and during **progression**, Lattice calls `POST /api/content/ensure-mcqs` to persist a generated MCQ set (distractor parity enforced on save).
- Seeds are **cold bootstrap only** when no generated rows exist yet.
- MCP hosts can enrich sets via `get_generation_brief` → `save_mcqs` / `ensure_mcq_curriculum`.

## Discussion (in-app chat)

Chat happens **in the Lattice UI**. Each Send:

1. Saves harness session config (depth / style / stage / lab / focus notes).
2. Persists the user message.
3. Runs **tool hooks** (`get_harness`, `get_journey`, `list_topic_mcqs`, sometimes `ensure_mcq_curriculum`).
4. Persists tool traces + assistant reply.

Optional MCP co-pilot: `list_pending_discussion`, `post_discussion_reply`, `get_discussion_thread` (`npm run mcp`).

## Pyodide coding

Untimed, strict (no hints/solutions/AI helpers). Vendored MIT subset of [`ombharatiya/AI-Engineer-Interview-Questions`](https://github.com/ombharatiya/AI-Engineer-Interview-Questions) — see `vendor/ai-engineer-interview-questions/`. Browser Wasm only; **no** host Python execute endpoint.

## MCP (your own Cursor agent)

```bash
npm run mcp
```

```json
{
  "mcpServers": {
    "lattice": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/absolute/path/to/study-room"
    }
  }
}
```

## Journey / database

- `cursor-app.json` → `{ "database": "postgres" }`; `migrations/*.sql`
- Local **PGlite** under `.lattice/pgdata` when `DATABASE_URL` unset
- Published apps get `DATABASE_URL` from the platform (do not bind as a secret)
- Learner key: Cursor identity `sub`

## Attribution

Vendored coding challenges © Om / ombharatiya, **MIT** — `vendor/ai-engineer-interview-questions/LICENSE`.

Engineering playbook: `skills/lattice-build-playbook.md`
