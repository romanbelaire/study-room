# Lattice

Quiet study desk for research-scientist interview prep (and any topic you add).

Modes: **Knowledge** (MCQs), **Coding** (untimed strict Python in the browser), **Discussion** (MCP harness for a host agent — not in-app chat), **Journey** (struggle / quick-forget / confirmed banks). Topic tabs are arbitrary.

## Local run

```bash
npm install
npm run dev          # http://127.0.0.1:4627  (PGlite when DATABASE_URL unset)
npm run build && npm run start
```

Requires Node 22+. First Coding run downloads Pyodide + numpy into the browser (CDN).

## Pyodide coding

Coding is **untimed** and **strict** (no hints, no solution reveal, no in-app AI helpers).

- Challenges are a vendored MIT subset of [`ombharatiya/AI-Engineer-Interview-Questions`](https://github.com/ombharatiya/AI-Engineer-Interview-Questions) (`12-coding-challenges/`). See [`vendor/ai-engineer-interview-questions/ATTRIBUTION.md`](vendor/ai-engineer-interview-questions/ATTRIBUTION.md) and [`LICENSE`](vendor/ai-engineer-interview-questions/LICENSE).
- Included: attention, sampling, PE/RoPE, LayerNorm/softmax, KV cache, mini-GPT.
- `GET /api/coding/python` serves problem / starter / tests only (read-only). There is **no** server-side execute endpoint.
- The browser loads Pyodide (Wasm), installs numpy, writes `solution.py` + `tests.py` into the Pyodide filesystem, and runs the suite locally. Submitted code never executes on the host.

Offline smoke of reference solutions (optional, host only): `python3 tests.py` with `reference.py` copied as `solution.py` in a temp dir.

## MCP (your own Cursor agent)

Start the stdio server from the repo root:

```bash
npm run mcp
```

Point Cursor at it with an `mcp.json` entry (Cursor → Settings → MCP, or project `.cursor/mcp.json`):

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

Replace `cwd` with your clone path. The host agent uses Lattice tools for topics, journey banks, and generating MCQ sets — Discussion is this harness, not a built-in chat coach.

Useful tools: `list_study_topics`, `create_study_topic`, `open_topic`, `get_generation_brief`, `save_mcqs`, `get_journey`, `record_outcome`. Resources: `lattice://study-topics`, `lattice://journey`, `lattice://skill/first-connect`. Prompt: `first-connect`.

Skill docs: `skills/first-connect.md`, `skills/generate-set.md`, `skills/mcq-authoring.md`.

## Journey / database

- `cursor-app.json` → `{ "database": "postgres" }`
- Schema: `migrations/*.sql` (topics, journey items, outcome events, topic sessions, generated content)
- Local: **PGlite** under `.lattice/pgdata` when `DATABASE_URL` is unset
- Published Cursor apps receive `DATABASE_URL` from the platform (do not bind it as an app secret)

Bucket rules: wrong/fail → struggle; first success after struggle → quick_forget; another success → confirmed; due `next_review_at` surfaces under quick-forget.

Learner key: Cursor identity `sub` (simulated locally via `cursor/identity.dev.ts`). DB API routes require a verified viewer.

## Attribution

Vendored coding challenges © Om / [ombharatiya/AI-Engineer-Interview-Questions](https://github.com/ombharatiya/AI-Engineer-Interview-Questions), **MIT License**. Full text: `vendor/ai-engineer-interview-questions/LICENSE`.
