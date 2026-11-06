# Lattice skill: generate study set

Use when a topic tab opens / first-connect completes, or the learner asks for a new set.

## Trigger

1. `open_topic` (after “What are you studying?”) or explicit generate request.
2. Call `get_generation_brief` for the active `topicId`.
3. Author items for **that arbitrary topic** (frontier, current; do not regurgitate Lattice seed trivia).
4. Persist with `save_mcqs` and optionally `save_coding_tasks`.
5. Tell the learner the applet Knowledge/Coding tabs will prefer the new set.

## MCQs (required)

- Produce 5–10 items.
- **Enforce `skills/mcq-authoring.md`:** all four choices match in complexity, length, specificity, and register. Server rejects sets that fail length parity.
- Plausible near-misses only; shuffle `answerIndex`.
- Elite RS bar — mechanisms, measurements, falsifiers.

## Coding (optional but preferred)

- 1–3 short tasks with `solve` + `check(solve)` returning a string on success / throwing on failure.
- Clear prompt, hint, solution.

## Tools

- `get_generation_brief` → schema + instructions  
- `save_mcqs` / `save_coding_tasks` → Postgres/PGlite persistence  
- `list_topic_content` → inspect what the UI will load  
