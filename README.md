# Lattice

Desktop-applet study desk for **OpenAI / Anthropic research scientist** interview prep (elite / &lt;1% bar).

## Modes

1. **Knowledge** — MCQs on attention/masking, scaling, RLHF/DPO, Spinning Up–style policy gradients, interpretability, evals/work-trial empirics, multimodal, safety (CAI, reward hacking, oversight), systems/inference, and lab culture differentials. Empty / loading / right-wrong + explanations.
2. **Coding** — Screen-faithful drills: masked causal softmax, 1NN-in-FFN sketch, request batcher, toy DB with CAS, stable softmax, KL penalty. In-browser editor, checks, hints, solutions.
3. **Discussion (MCP harness)** — Not an in-app chat coach. Run `npm run mcp` and attach the server from Cursor (or any MCP host). The **host LLM agent** runs the longer-form interview; Lattice supplies tools / resources / prompts aligned to the loop (screening → mid → onsite, OpenAI empirics vs Anthropic taste/oversight). The applet shows connect docs, tool catalog, and harness session controls that read/write `.lattice/harness-state.json`.

Content bar: see the durable blueprint in the project store at `docs/interview-loop-blueprint.md` (mirrored conceptually in `mcp/blueprint.ts`).

## Run the applet

```bash
npm install
npm run dev
```

Dev server: **http://127.0.0.1:4627**

```bash
npm run build
npm run preview
```

## Run the MCP discussion harness

```bash
npm run mcp
```

stdio MCP server (`mcp/server.ts`). Optional env:

| Variable | Purpose |
| --- | --- |
| `LATTICE_HARNESS_PATH` | Override harness JSON path (default `.lattice/harness-state.json`) |

### Cursor MCP config

Add to your MCP settings (set `cwd` to this repo):

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

A copyable snippet also lives in the applet **Discussion** tab.

### Tools / prompts / resources

- **Tools:** `list_topics`, `get_harness`, `set_harness`, `start_round`, `probe`, `critique_answer`, `summarize_session`, `reset_harness`
- **Prompts:** `screen-research-agenda`, `openai-ml-math-live`, `anthropic-coderpad`, `openai-work-trial`, `anthropic-research-day`, `onsite-defense`, `mission-gate`, `theory-spinning-up`
- **Resources:** `lattice://blueprint`, `lattice://harness`, `lattice://topics`

Typical flow: host agent calls `set_harness` → `start_round` → interviews you in chat → `probe` / `critique_answer` → `summarize_session`.

Local applet harness controls POST/GET `/api/harness` (Vite middleware) so the UI can sync the same state file the MCP process uses. Published static builds still show connect instructions and catalogs; live file sync needs local `npm run dev`.

## Stack

Vite · React · TypeScript · Tailwind CSS v4 · `@modelcontextprotocol/sdk`
