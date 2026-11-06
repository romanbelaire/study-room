# OpenAI / Anthropic research scientist interview loop

Canonical durable copy also lives in the project store at `docs/interview-loop-blueprint.md`. Runtime mirror: `mcp/blueprint.ts`.

Rigor: **&lt;1% acceptance bar** — elite technical depth, no fluff. Prefer open materials (e.g. Spinning Up) where they sharpen RL/optimization intuition.

## Screening

| Track | Drill |
| --- | --- |
| Shared | Research agenda, pubs, motivation — claim → evidence → limitation; why this lab. |
| Anthropic CodeSignal / CoderPad | **Batcher**, **toy DB**, no-AI notebook discipline. |
| OpenAI live ML-math | **Masked softmax**, **1NN-in-FFN**-style constructions, stable numerics. |

## Mid-stage

| Lab | Format | Signal |
| --- | --- | --- |
| OpenAI | ~48h work-trial | Speed, tests, empirical uncertainty; honest failure modes. |
| Anthropic | 4–5h research day | Experiment design + trade-off writeup; taste under interruption. |

## Onsite

- Interrupted research defense; falsifiers in ≤ eng-weeks.
- ML systems: scaling laws, inference (KV/batching/spec decode), GPU scheduling, safety layers.
- Mission gatekeepers:
  - **Anthropic:** Constitutional AI, reward hacking, scalable oversight.
  - **OpenAI:** Charter judgment, intellectual honesty, collab friction.

## Culture

| OpenAI | Anthropic |
| --- | --- |
| Speed, execution, shipped empirics | Alignment philosophy, research taste |
| Measured iteration | Peer collaboration + mid-loop academic refs |

## Lattice mapping

- **Knowledge / Coding** applet modes seed this bar.
- **Discussion** = MCP harness (`npm run mcp`) the host agent attaches to — tools/prompts coach against this loop, not an in-app mock chat.
