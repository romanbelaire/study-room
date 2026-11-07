# Lattice skill: generate study set (proactive)

Curriculum generation is **proactive**, not an optional afterthought.

## When it fires

1. **Topic load / select** — UI calls `POST /api/content/ensure-mcqs` (also from KnowledgeMode mount).
2. **Progression** — after stretches of answered MCQs / near end of deck, Knowledge requests a **top-up**.
3. **Discussion turns** — in-app agent may call `ensure_mcq_curriculum` when the learner asks for questions or on a cadence.
4. **MCP host** — `ensure_mcq_curriculum` or classic `get_generation_brief` → `save_mcqs` to replace/enrich the synthesizer set with frontier items.

Seeds appear in the UI **only** as cold bootstrap when no generated rows exist yet.

## Host agent path (preferred quality)

1. `get_generation_brief` for the active `topicId`.
2. Author 5–10 frontier MCQs for **that** topic.
3. Enforce `skills/mcq-authoring.md` distractor parity (server rejects length tells).
4. `save_mcqs` (optional `save_coding_tasks`).
5. `list_topic_content` to confirm.

## Tools

- `ensure_mcq_curriculum` — bootstrap/top-up job + persistence  
- `get_generation_brief` / `save_mcqs` / `list_topic_content`  
- Discussion: `list_pending_discussion`, `post_discussion_reply`, `get_discussion_thread`
