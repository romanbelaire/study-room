# Lattice build playbook

Coordinator/worker playbook for **engineering** a Lattice-like study desk. Product model (authoritative):

- **Knowledge** — agent generates MCQs **proactively** on topic load and throughout progression; seeds only as cold bootstrap; persist + distractor parity.
- **Discussion** — **in-app chat** in the desk UI; message + tool-call hooks to the agent/MCP; harness controls are session config for that chat (not “attach Cursor elsewhere” as the only surface).
- **Coding** — untimed strict browser Pyodide; vendored attributed challenges; no host execute.
- **Journey** — struggle / quick_forget / confirmed; identity-bound APIs; Apps Postgres + local fallback.

---

## Target architecture

| Layer | Choice |
| --- | --- |
| UI | Vite + React + TS + Tailwind; uncommon port (e.g. 4627) |
| Discussion | In-app transcript + composer; harness depth/style/stage/lab/notes as session config |
| Agent bridge | `POST /api/discussion/messages` → persist user → **tool hooks** → assistant reply; MCP can `list_pending_discussion` / `post_discussion_reply` |
| Curriculum | `POST /api/content/ensure-mcqs` on topic load + progression top-up; `save_mcqs` parity checks |
| Data | `cursor-app.json` Postgres + migrations; PGlite when `DATABASE_URL` unset |
| Identity | `add-app-identity`; learner = verified `sub` |
| Coding | Pyodide + numpy; read-only challenge GET; never spawn host Python on submissions |

---

## Phase 0 — Scaffold

1. Vite React-TS scaffold → repo root; quiet decluttered UI.
2. Mode shell: Knowledge | Coding | Discussion | Journey + arbitrary topics.
3. Bind uncommon port; run `npm run dev` early for publish preview.

---

## Phase 1 — In-app Discussion + MCP

1. Message store (`discussion_messages`) + GET/POST `/api/discussion/messages`.
2. On Send: save harness → append user → run tools (`get_harness`, `get_journey`, curriculum ensure, …) → append tool traces + assistant.
3. MCP stdio still ships for host agents: drain pending users, post replies, curriculum tools.
4. UI: chat primary; “Session config” for depth/style/stage/lab/notes — **not** a Connect-only page.

---

## Phase 2 — Identity + journey DB

1. `requireViewer` on all DB routes; ignore client learner ids.
2. Migrations for topics, journey, outcomes, generated items, discussion, generation_jobs.
3. Local PGlite; publish `DATABASE_URL` from platform only.

---

## Phase 3 — Proactive Knowledge curriculum

1. Topic select / Knowledge mount → `ensure-mcqs` (bootstrap).
2. Progression (near end of deck / every N answers) → `ensure-mcqs` top-up.
3. Persist via `save_mcqs`; distractor parity skill + server assert.
4. UI uses generated when present; **seeds only if generated count is 0**.
5. MCP `ensure_mcq_curriculum` / `save_mcqs` can enrich beyond the local synthesizer.

---

## Phase 4 — Pyodide coding

Vendor MIT packs; client Wasm runner; no `POST …/run` host interpreter. Strict, untimed.

### Security traps

| Trap | Fix |
| --- | --- |
| Host Python/Node exec of visitor code | Pyodide only |
| Unauthenticated DB routes | Verified viewer |
| Client learner id | Bind to `sub` |
| Reference solutions in client payload | Disk-only |

---

## Phase 5 — Publish + GitHub

Commit/push; `publish-app` with `preview_url`. README: npm, proactive Knowledge, in-app Discussion + tools, Pyodide, mcp.json, journey/DB, attribution. Empty GitHub repo → push `main`; else branch + PR.

---

## Ship checklist

- [ ] In-app Discussion chat with harness session config + tool hooks
- [ ] Knowledge ensure on load + progression; seeds cold-only
- [ ] Distractor parity on save
- [ ] Pyodide coding; no host execute
- [ ] Identity-bound APIs; Postgres + local fallback
- [ ] MCP tools for discussion drain/reply + curriculum
- [ ] README + this playbook updated; GitHub pushed

---

## Pasteable CreateAgent kickoff

```text
Greenfield Lattice-style desk for {DOMAIN}.

Vite+React+TS+Tailwind. Modes: Knowledge | Coding | Discussion | Journey.

Product rules:
1) Knowledge: PROACTIVELY generate/persist MCQs on topic load and during progression
   (ensure-mcqs). Seeds only if no generated set. Distractor parity on save.
2) Discussion: IN-APP chat (not harness-status-only). Harness depth/style/stage/lab/notes
   are session config. Each message runs tool hooks; MCP can co-drive via pending/reply tools.
3) Coding: untimed strict Pyodide; MIT-vendored challenges; no host python3 execution.
4) Journey + identity-bound Postgres (PGlite local). MCP stdio for host agents.
5) README + playbook; publish-app; push {GITHUB_REPO}.
```
