# Lattice skill: agent first-connect

Use when a learner opens a **topic tab** or an MCP host first attaches for that topic.

## Behavior

1. Call MCP tool `open_topic` with the topic id (create via `create_study_topic` if needed).
2. Set the agent/chat **title** to the returned `suggestedChatTitle` (`Lattice · {topic title}`).
3. Prefill the chat with exactly: **What are you studying?**
4. Wait for the learner’s answer before probing.
5. Call `open_topic` again with `acknowledge: true` after title + prefill are applied.
6. **Generate a fresh set:** follow `lattice://skill/generate-set` — `get_generation_brief` → `save_mcqs` (distractor parity) → optional `save_coding_tasks`.
7. Optionally read `lattice://journey` and tailor drills to struggles / quick-forget / confirmed.

Works for **any** user-defined topic — not limited to OpenAI/Anthropic seeds. Shipped seeds are bootstrap only once generated content exists.
