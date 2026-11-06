# Study desk workflow skill

Reusable pattern for Lattice-like study applets: Knowledge + Coding + Discussion (MCP) + Journey, with agent-authored sets, identity-bound data, and a safe browser coding runner.

Use this when spinning up a similar desk for a new domain (interview loop, course, certification, team ramp).

---

## 1. Product shape (four modes)

| Mode | What it is | What it is not |
| --- | --- | --- |
| **Knowledge** | MCQ deck; outcomes write to journey | Essay tutor |
| **Coding** | Untimed, strict editor + real tests | Timed contest; AI copilot in-app |
| **Discussion** | MCP harness a **host agent** attaches to | In-app mock chat coach |
| **Journey** | Banks: `struggle` → `quick_forget` → `confirmed` | Generic analytics dashboard |

Ship one composition UI (topic tabs + mode switch). Seeds bootstrap; agents refresh content.

**Bucket rules:** wrong/fail → struggle; first success after struggle → quick_forget; another success → confirmed; due `next_review_at` surfaces under quick-forget.

---

## 2. Topics, first-connect, agent sets

### Arbitrary topics
- Persist topic tabs (not hard-coded exams). Owner-scoped create/delete; shared seeds read-only.
- UI: Add / Remove + switcher.

### Agent first-connect
When the host agent opens a topic:
1. Call `open_topic` → set chat title to `{App} · {topic title}`
2. Prefill exactly: **What are you studying?**
3. Call `open_topic` again with `acknowledge: true`
Document in `skills/first-connect.md` + MCP prompt `first-connect`.

### Agent-generated sets
- MCP: `get_generation_brief` → `save_mcqs` / (optional) coding saves; UI prefers generated over seeds.
- **Distractor parity (standing rule):** all alternates match the correct answer in complexity, length, specificity, and register. Reject length tells (e.g. ≤35% word-count spread). Checklist: `skills/mcq-authoring.md`.

---

## 3. Coding: untimed, strict, safe runner

Requirements:
- Untimed; no in-app AI helpers / hints / solution reveal.
- Real language tests (not `new Function` notepad theater).

**Prefer browser Pyodide (or equivalent Wasm)** for anything that may be published:
- Host must **not** `spawn` visitor Python/JS against host CPython/Node with env/FS access — publish security review treats that as critical (credential theft via `/proc`, etc.).
- Serve challenge payloads read-only (`problem`, `starter`, `tests`). Keep `reference` on disk for offline smoke only — never ship to client.
- Client: load runtime + numpy (or domain libs), write `solution` + `tests` into Wasm FS, run suite, map pass/fail → journey.

**Vendored packs:** only MIT/compatible licenses; copy `LICENSE` + `ATTRIBUTION.md`; cite upstream in UI and README.

---

## 4. Identity + database

- All journey/topic/content mutations require verified Cursor viewer (`identity.sub`). Ignore client-supplied learner IDs.
- Apps: `cursor-app.json` `{ "database": "postgres" }` + `migrations/*.sql`. Platform sets `DATABASE_URL` on publish — do not bind it as an app secret.
- Local fallback: PGlite (or equivalent) when `DATABASE_URL` unset.
- Use `cursor/identity.ts` from `add-app-identity`; simulate locally via `identity.dev.ts`.

---

## 5. Publish + GitHub for others’ agents

### Publish
1. Clear security findings (especially no host code execution of visitor input).
2. Commit + push working branch; keep dev server up; `publish-app` with `preview_url`.
3. User confirms slug + visibility + terms.

### GitHub clone
README must include:
- Local `npm install` / `npm run dev` / `npm run build && npm run start`
- Coding runner note (Pyodide; no host execute)
- MCP: `npm run mcp` + sample Cursor `mcp.json` with absolute `cwd`
- Journey/DB notes (Postgres publish / PGlite local)
- MIT (or other) vendor attribution paths

Push: if destination repo is empty → initial push to `main`. If it already has commits on the default branch → feature branch + PR.

---

## 6. Kickoff prompt (paste for a new domain)

```text
Build a Lattice-style study desk for {DOMAIN} (Vite+React+TS+Tailwind unless specified).

Modes:
1) Knowledge — MCQs; distractor parity (complexity/length/specificity/register).
2) Coding — untimed, strict, no in-app AI helpers. Real tests. Prefer browser Pyodide
   so submissions never run on the host. Vendor an attributed MIT (or compatible)
   challenge subset if a good upstream exists; otherwise author a small pack with tests.
3) Discussion — MCP stdio harness a host agent attaches to (NOT in-app chat). Include
   first-connect: title `{App} · {topic}` + prefill “What are you studying?”
4) Journey — struggle / quick_forget / confirmed banks; wire MCQ + coding outcomes.

Also:
- Arbitrary topic tabs; agent tools to generate/save MCQ sets per topic (seeds bootstrap only).
- Identity-bound APIs (Cursor viewer sub); cursor-app.json Postgres + local PGlite fallback.
- README: npm run, Pyodide coding, `npm run mcp` + mcp.json, journey/DB, attribution.
- Publish when runnable; push to {GITHUB_REPO} (main if empty, else branch+PR).
```

Replace `{DOMAIN}` and `{GITHUB_REPO}`. Keep UI decluttered; brand/product name as hero signal on first viewport for landing-like surfaces; study desk UIs stay dense but quiet.

---

## Checklist (ship bar)

- [ ] Four modes wired; Discussion = MCP only
- [ ] Topics arbitrary + first-connect skill/prompt
- [ ] MCQ distractor parity enforced in authoring skill + saves
- [ ] Coding: Pyodide (or proven sandbox); no host `python3`/`node` eval of submissions
- [ ] Vendor LICENSE + ATTRIBUTION; UI citation
- [ ] Identity on all DB routes; Postgres + local fallback
- [ ] README covers npm, Pyodide, MCP mcp.json, journey/DB, attribution
- [ ] Publish cleared security review; GitHub remote has clone-ready tree
