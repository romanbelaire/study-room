# Lattice build playbook

Coordinator/worker playbook for **engineering** a Lattice-like study desk (not the in-app pedagogy). Reuse when spinning a greenfield Vite/React desk with MCP discussion, journey DB, safe coding runner, publish, and GitHub handoff.

Canonical Lattice reference lives in the study-room / applet tree. Prefer this playbook over rediscovering traps.

---

## Target architecture

| Layer | Choice |
| --- | --- |
| UI | Vite + React + TS + Tailwind; shadcn primitives if needed |
| Dev/prod server | Vite plugin in `npm run dev`; `tsx server/start.ts` after build; uncommon port (e.g. 4627) |
| Discussion | MCP **stdio** server (`npm run mcp`) — host agent attaches; **not** in-app chat |
| Data | `cursor-app.json` `{ "database": "postgres" }` + `migrations/*.sql`; local **PGlite** when `DATABASE_URL` unset |
| Identity | `cursor-cloud` `add-app-identity` → `cursor/identity.ts`; learner = verified `sub` |
| Coding | Browser **Pyodide** + numpy; read-only challenge API; **no** host `python3`/`spawn` of submissions |
| Content | Seeds bootstrap; MCP `save_mcqs` (etc.) for agent-generated sets |

---

## Phase 0 — Scaffold

1. Official scaffold (e.g. Vite React-TS) into a subdir, move to repo root; replace seeded README.
2. Tailwind + quiet visual system (CSS variables). Declutter prefs: no ornamental border trims, no flavor chrome, brand/product name readable; avoid purple-gradient / cream-serif clichés.
3. Modes shell: Knowledge | Coding | Discussion | Journey + arbitrary topic tabs.
4. Bind uncommon port; `npm run dev` early so publish preview works later.

---

## Phase 1 — MCP discussion harness

1. `@modelcontextprotocol/sdk` stdio server under `mcp/server.ts`.
2. Tools for topics, journey, generation brief/save, open_topic first-connect — **not** a coach that chats inside the page.
3. Discussion UI = harness status / attach instructions only.
4. Document Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "lattice": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/absolute/path/to/clone"
    }
  }
}
```

5. Skills in-repo: `skills/first-connect.md`, `skills/generate-set.md`, `skills/mcq-authoring.md`.
6. First-connect contract: title `{App} · {topic}`; prefill **What are you studying?**; `acknowledge: true` after.

---

## Phase 2 — Identity-bound APIs + journey DB

1. Call `add-app-identity` once; never hand-edit `cursor/identity.ts`.
2. Every DB route: `requireViewer` → use `identity.sub` only; reject client learner IDs.
3. Migrations: topics, journey_items (`struggle` \| `quick_forget` \| `confirmed`), outcome_events, topic_sessions, generated content tables as needed.
4. Bucket wiring from Knowledge/Coding outcomes.
5. Local: PGlite under `.app/pgdata` (or similar). Publish: platform `DATABASE_URL` — do **not** `bind-app-secrets` it.
6. Owner-scope user topics; shared seeds read-only.

---

## Phase 3 — Agent-generated content + distractor parity

1. MCP: `get_generation_brief` → `save_mcqs` / optional coding saves; UI prefers generated over seeds.
2. Standing MCQ rule (skill + server validation): distractors match correct answer in **complexity, length, specificity, register** (e.g. reject >35% word-count spread). No “longest option wins.”
3. Seeds remain fallback only.

---

## Phase 4 — Untimed strict coding (Pyodide)

1. Vendor MIT/compatible packs only → `LICENSE` + `ATTRIBUTION.md` + UI citation.
2. Split each challenge: `PROBLEM.md`, `starter.py`, `tests.py`; keep `reference.py` for offline smoke — **never** send reference to the client.
3. API: read-only `GET` catalog (problem/starter/tests). **Delete any** `POST …/run` that spawns host interpreters.
4. Client: load Pyodide from CDN, `loadPackage('numpy')`, write files into Wasm FS, run tests, timeout in-browser; pass/fail → journey.
5. Strict UX: no Hint / Solution / in-app AI helpers; untimed label visible.

### Security review traps (will block publish)

| Trap | Fix |
| --- | --- |
| Unsandboxed host Python/Node executing visitor code | Pyodide (or real sandbox); no `spawn('python3', …)` on submissions |
| Missing auth on DB/mutation routes | Verified Cursor viewer on every stateful route |
| Client-supplied learner id | Ignore; bind to `sub` |
| Shipping reference solutions / secrets | Keep reference server-disk-only; no hardcoded secrets |
| `DATABASE_URL` as bound “secret” | Platform-injected only |

---

## Phase 5 — Publish

1. Commit + push working branch; app must run locally.
2. `publish-app` with `preview_url` pointing at the live dev/start server; leave server up.
3. User confirms slug, visibility, terms. Fix blocking review findings before retrying — do not republish the same unsafe runner.

---

## Phase 6 — Push to user GitHub (clone + own agent)

1. README must cover: `npm install` / `npm run dev` / `npm run start`; Pyodide coding; `npm run mcp` + `mcp.json`; journey/DB; vendor attribution.
2. Destination empty → initial push to `main`. Destination has commits → feature branch + PR.
3. Needs GitHub write credentials on the agent (`gh auth` / connected account). Without them, prepare the tree and ask the user to authorize device login or connect GitHub — then push.

---

## Ship checklist

- [ ] Vite/React desk on uncommon port; decluttered UI
- [ ] Four modes; Discussion = MCP attach only
- [ ] Identity on all DB routes; Postgres + local fallback
- [ ] Agent generate/save + distractor parity skill/validation
- [ ] Pyodide coding; no host execute endpoint; MIT attribution
- [ ] Security review clean (auth + sandbox)
- [ ] publish-app proposed/live
- [ ] GitHub remote cloneable; README MCP section accurate

---

## Pasteable CreateAgent / coordinator kickoff

```text
Greenfield Lattice-style study desk for {DOMAIN}.

Stack: Vite + React + TS + Tailwind. Uncommon port. Quiet UI (no ornamental chrome).

Build order:
1) Mode shell: Knowledge | Coding | Discussion | Journey + arbitrary topic tabs.
2) MCP stdio harness (`npm run mcp`) — host agent attaches for discussion; NOT in-app chat.
   first-connect: title `{App} · {topic}`; prefill “What are you studying?”
3) Identity-bound APIs (Cursor viewer sub only). cursor-app.json Postgres + migrations;
   local PGlite when DATABASE_URL unset. Journey buckets struggle → quick_forget → confirmed.
4) Agent-generated MCQs via MCP save tools; enforce distractor parity skill.
5) Coding: untimed, strict, no in-app AI helpers. Browser Pyodide + numpy. Vendor MIT
   challenge subset with LICENSE/ATTRIBUTION. No host python3 execution of submissions
   (publish security blocks unsandboxed runners).
6) README: npm scripts, Pyodide, mcp.json, journey/DB, attribution.
7) Commit/push; publish-app with preview_url; push tree to {GITHUB_REPO}
   (main if empty, else branch + PR).

Do not ship an in-app chat coach. Do not evaluate visitor code on the host.
```

Replace `{DOMAIN}`, `{App}`, `{GITHUB_REPO}`.
