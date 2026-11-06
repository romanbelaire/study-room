# Lattice

Quiet study desk for research-scientist interview prep (and any topic you add).

## Modes

- **Knowledge** — MCQs; outcomes write to the learner journey
- **Coding** — untimed strict Python in-browser (Pyodide + numpy); vendored MIT challenges; pass/fail → journey buckets; no in-app AI helpers
- **Discussion** — MCP harness for a host agent (not in-app chat)
- **Journey** — struggles / quick-forget / confirmed knowledge bank

Topic tabs are **arbitrary** (Add your own). Seeds ship for convenience only.

### MCQ authoring (standing rule)

All alternate answers must match the correct answer in **complexity, length, specificity, and register** — no solving by “which option looks different.” Plausible near-misses only. Full checklist: `skills/mcq-authoring.md`.

### Agent-generated sets

Shipped seeds bootstrap Knowledge. Coding runs a **browser Pyodide** runner (Wasm + numpy) against a vendored MIT subset of [`ombharatiya/AI-Engineer-Interview-Questions`](https://github.com/ombharatiya/AI-Engineer-Interview-Questions) (`12-coding-challenges/`). Submitted code never executes on the Cursor host. See `vendor/ai-engineer-interview-questions/ATTRIBUTION.md`. The MCP agent can still author MCQ sets via `get_generation_brief` → `save_mcqs` (see `skills/generate-set.md`). Journey outcomes use challenge ids as item keys.

## Coding runner

- Challenges live under `vendor/ai-engineer-interview-questions/challenges/` (starter + PROBLEM + tests; reference kept on disk for offline smoke only — never sent to the client).
- `GET /api/coding/python` serves problem / starter / tests only (read-only). There is **no** server-side execute endpoint.
- The browser loads Pyodide from the public CDN, installs numpy in Wasm, writes `solution.py` + `tests.py` into the Pyodide FS, and runs the suite locally (25s client timeout).
- Mode is **untimed** and **strict**: no hints, no solution reveal, no in-app AI helpers.

## Run

```bash
npm install
npm run dev          # http://127.0.0.1:4627  (PGlite when DATABASE_URL unset)
npm run mcp          # stdio MCP harness
npm run build && npm run start
```

## Database

- `cursor-app.json` → `{ "database": "postgres" }`
- Schema: `migrations/001_journey.sql`
- Published apps get `DATABASE_URL` from the platform (do not bind it as a secret)
- Local / this VM: **PGlite** under `.lattice/pgdata` when `DATABASE_URL` is unset

### Schema (summary)

| Table | Purpose |
| --- | --- |
| `topics` | Arbitrary study topic tabs |
| `journey_items` | Per-learner items in `struggle` \| `quick_forget` \| `confirmed` |
| `outcome_events` | Append-only MCQ/coding outcomes |
| `topic_sessions` | First-connect acknowledgements |

Bucket rules: wrong/fail → struggle; first success after struggle → quick_forget; another success → confirmed; due `next_review_at` surfaces under quick-forget.

Learner key: always Cursor identity `sub` (simulated locally via `cursor/identity.dev.ts`). DB API routes require a verified viewer; client-supplied learner IDs are ignored. Shared seed topics are read-only; user-created topics are owner-scoped.

## MCP

```json
{
  "mcpServers": {
    "lattice": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/absolute/path/to/lattice"
    }
  }
}
```

### Journey / topics

| Tool | Role |
| --- | --- |
| `list_study_topics` / `create_study_topic` | Arbitrary topic tabs |
| `open_topic` | First-connect: title + prefill; hints generate-set |
| `get_generation_brief` / `save_mcqs` / `save_coding_tasks` / `list_topic_content` | Agent-authored study sets |
| `get_journey` / `record_outcome` / `set_journey_bucket` | Journey banks |

Resources: `lattice://study-topics`, `lattice://journey`, `lattice://skill/first-connect`  
Prompt: `first-connect`

### Title + prefill (agent first-connect)

1. Host calls `open_topic` for the active tab (or prompt `first-connect`)
2. Sets chat/agent title to `Lattice · {topic title}`
3. Prefills exactly: **What are you studying?**
4. Calls `open_topic` again with `acknowledge: true`

Skill doc: `skills/first-connect.md`

Optional: `LATTICE_HARNESS_PATH` for harness JSON path.
