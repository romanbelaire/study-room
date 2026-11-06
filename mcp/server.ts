#!/usr/bin/env node
/**
 * Lattice discussion harness — MCP server for RS interview prep.
 * Attach from Cursor / any MCP host. Discussion happens in the host agent;
 * this server supplies loop structure, drills, probes, and critique scaffolds.
 *
 * Log only on stderr — stdout is JSON-RPC.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  BLUEPRINT,
  DRILL_TOPICS,
  defaultHarness,
  topicById,
  type Depth,
  type HarnessState,
  type Lab,
  type Stage,
  type Style,
} from './blueprint.ts'
import { HARNESS_PATH, loadHarness, saveHarness, touchTool } from './state.ts'

const server = new McpServer({
  name: 'lattice-harness',
  version: '1.0.0',
})

function text(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
  }
}

function styleDirective(style: Style, depth: Depth): string {
  if (style === 'socratic') {
    return depth === 'deep'
      ? 'Ask why / falsifiers until mechanisms are explicit.'
      : 'Short sharp questions; demand structured 6–10 sentence answers.'
  }
  if (style === 'critique') {
    return 'Paper-review mode: clarity, novelty, failure modes, missing ablations.'
  }
  if (style === 'whiteboard') {
    return 'Force diagrams: boxes, arrows, complexity, bottlenecks, memory traffic.'
  }
  return 'Interrupted defense: accept the thesis, then attack one joint at a time.'
}

function cultureHint(lab: Lab): string {
  if (lab === 'openai') return 'Bias signal toward speed, tests, shipped empirics, intellectual honesty.'
  if (lab === 'anthropic') {
    return 'Bias signal toward alignment philosophy, research taste, peer collab, mid-loop academic refs.'
  }
  return 'Call out when an answer fits OpenAI empirics culture vs Anthropic taste/oversight culture.'
}

server.registerResource(
  'blueprint',
  'lattice://blueprint',
  {
    title: 'Interview loop blueprint',
    description: 'OpenAI/Anthropic RS loop stages, culture, rigor bar',
    mimeType: 'text/markdown',
  },
  async (uri) => ({ contents: [{ uri: uri.href, text: BLUEPRINT, mimeType: 'text/markdown' }] }),
)

server.registerResource(
  'harness',
  'lattice://harness',
  {
    title: 'Current harness state',
    description: 'Active topic/stage/lab/depth/style and last probe',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(loadHarness(), null, 2), mimeType: 'application/json' }],
  }),
)

server.registerResource(
  'topics',
  'lattice://topics',
  {
    title: 'Drill topics catalog',
    description: 'All MCP drill topics aligned to the loop blueprint',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(DRILL_TOPICS, null, 2), mimeType: 'application/json' }],
  }),
)

server.registerTool(
  'list_topics',
  {
    title: 'List drill topics',
    description: 'List Lattice RS interview drill topics (optionally filter by stage/lab).',
    inputSchema: {
      stage: z.enum(['screening', 'mid', 'onsite', 'culture']).optional(),
      lab: z.enum(['openai', 'anthropic', 'either']).optional(),
    },
  },
  async ({ stage, lab }) => {
    let rows = DRILL_TOPICS
    if (stage) rows = rows.filter((t) => t.stage === stage)
    if (lab) rows = rows.filter((t) => t.lab === lab || t.lab === 'either' || lab === 'either')
    touchTool(loadHarness(), 'list_topics')
    return text(rows.map((t) => ({ id: t.id, title: t.title, stage: t.stage, lab: t.lab, blurb: t.blurb })))
  },
)

server.registerTool(
  'get_harness',
  {
    title: 'Get harness',
    description: 'Return current discussion harness configuration and last probe.',
    inputSchema: {},
  },
  async () => text(loadHarness()),
)

server.registerTool(
  'set_harness',
  {
    title: 'Set harness',
    description:
      'Configure the interview discussion harness (topic, stage, lab, depth, style, focus notes). Call before starting a round.',
    inputSchema: {
      topicId: z.string().optional().describe('Drill topic id from list_topics'),
      stage: z.enum(['screening', 'mid', 'onsite', 'culture']).optional(),
      lab: z.enum(['openai', 'anthropic', 'either']).optional(),
      depth: z.enum(['screen', 'deep']).optional(),
      style: z.enum(['socratic', 'critique', 'whiteboard', 'defense']).optional(),
      focusNotes: z.string().optional(),
      resetRound: z.boolean().optional(),
    },
  },
  async (args) => {
    const cur = loadHarness()
    if (args.topicId) topicById(args.topicId)
    const next: HarnessState = {
      ...cur,
      topicId: args.topicId ?? cur.topicId,
      stage: (args.stage as Stage | undefined) ?? cur.stage,
      lab: (args.lab as Lab | undefined) ?? cur.lab,
      depth: (args.depth as Depth | undefined) ?? cur.depth,
      style: (args.style as Style | undefined) ?? cur.style,
      focusNotes: args.focusNotes ?? cur.focusNotes,
      round: args.resetRound ? 0 : cur.round,
      lastTool: 'set_harness',
      updatedAt: new Date().toISOString(),
    }
    if (args.topicId) {
      const t = topicById(args.topicId)
      next.stage = args.stage ?? t.stage
      next.lab = args.lab ?? t.lab
    }
    saveHarness(next)
    return text(next)
  },
)

server.registerTool(
  'start_round',
  {
    title: 'Start discussion round',
    description:
      'Open a longer-form interview round. Returns coach instructions the HOST agent must follow while talking with the candidate (not a substitute chat).',
    inputSchema: {
      topicId: z.string().optional(),
    },
  },
  async ({ topicId }) => {
    let state = loadHarness()
    if (topicId) {
      const t = topicById(topicId)
      state = {
        ...state,
        topicId,
        stage: t.stage,
        lab: t.lab,
        round: state.round + 1,
      }
    } else {
      state = { ...state, round: state.round + 1 }
    }
    const topic = topicById(state.topicId)
    const probe = topic.probes[0]
    state = touchTool({ ...state, lastProbe: probe }, 'start_round', probe)
    const brief = [
      '# Lattice round brief (for host agent)',
      '',
      `Topic: ${topic.title} (${topic.id})`,
      `Stage: ${state.stage} · Lab: ${state.lab} · Depth: ${state.depth} · Style: ${state.style}`,
      `Round: ${state.round}`,
      state.focusNotes.trim() ? `Focus notes: ${state.focusNotes.trim()}` : 'Focus notes: (none)',
      '',
      '## Host agent rules',
      '- YOU are the interviewer/coach. Discuss with the candidate in this chat.',
      '- Use Lattice tools for probes, scoring scaffolds, and gap summaries — do not invent a softer bar.',
      `- Style: ${styleDirective(state.style, state.depth)}`,
      `- Culture: ${cultureHint(state.lab)}`,
      '- Rigor: <1% bar — demand mechanisms, measurements, falsifiers; no motivational fluff.',
      '',
      '## Opening probe',
      probe,
      '',
      '## Further probes on this topic',
      ...topic.probes.slice(1).map((p, i) => `${i + 2}. ${p}`),
      '',
      '## Refs to expect',
      ...topic.refs.map((r) => `- ${r}`),
      '',
      `Harness file: ${HARNESS_PATH}`,
    ].join('\n')
    return text(brief)
  },
)

server.registerTool(
  'probe',
  {
    title: 'Next probe',
    description: 'Emit the next harder / follow-up probe for the active harness (host agent asks the candidate).',
    inputSchema: {
      mode: z.enum(['followup', 'harder', 'systems', 'mission', 'falsifier']).default('followup'),
    },
  },
  async ({ mode }) => {
    const state = loadHarness()
    const topic = topicById(state.topicId)
    const idx = Math.min(state.round, topic.probes.length - 1)
    let probe = topic.probes[idx]
    if (mode === 'harder') {
      probe = `Harder (${state.depth}): ${probe} Compress to mechanisms + one quantitative estimate + one falsifier.`
    } else if (mode === 'systems') {
      probe =
        'Systems cut: where do FLOPs, memory bandwidth, and wall-clock diverge in your story? Give orders of magnitude.'
    } else if (mode === 'mission') {
      probe =
        state.lab === 'openai'
          ? 'Mission cut (OpenAI): where does intellectual honesty force you to slow shipping — and what do you still ship?'
          : state.lab === 'anthropic'
            ? 'Mission cut (Anthropic): where does reward hacking or oversight failure invalidate the metric you just praised?'
            : 'Mission cut: restate the claim under both Constitutional-AI oversight and Charter-style honesty pressures.'
    } else if (mode === 'falsifier') {
      probe = 'Falsifier: name the cheapest experiment that would kill this thesis. Pass/fail criterion?'
    } else {
      probe = `Follow-up: ${probe}`
    }
    touchTool(state, 'probe', probe)
    return text({
      probe,
      style: styleDirective(state.style, state.depth),
      culture: cultureHint(state.lab),
      topicId: state.topicId,
    })
  },
)

server.registerTool(
  'critique_answer',
  {
    title: 'Critique candidate answer',
    description:
      'Given the candidate’s answer text, return a rigorous strengths/gaps scaffold the host agent should use (not a soft pep talk).',
    inputSchema: {
      answer: z.string().describe('Candidate answer to critique'),
    },
  },
  async ({ answer }) => {
    const state = loadHarness()
    const topic = topicById(state.topicId)
    const lower = answer.toLowerCase()
    const gaps: string[] = []
    const strengths: string[] = []
    if (/(tradeoff|trade-off|however|limitation|fail|brittle)/.test(lower)) {
      strengths.push('Named a limitation/tradeoff.')
    } else gaps.push('Missing explicit limitation / failure mode.')
    if (/(measur|eval|metric|ablation|experiment|test|ci|error bar|uncertain)/.test(lower)) {
      strengths.push('Tied claim to measurement or uncertainty.')
    } else gaps.push('No measurement, eval, test, or uncertainty language.')
    if (/(because|therefore|mechanis|gradient|bandwidth|kl|policy|attention|kv )/i.test(answer)) {
      strengths.push('Some mechanism-level language present.')
    } else gaps.push('Too noun-heavy — demand causal mechanism.')
    if (answer.trim().split(/\s+/).length < 80) gaps.push('Too thin for onsite/mid-loop signal — expand one concrete example.')
    if (state.lab === 'anthropic' && !/(oversight|constitution|reward hack|alignment|prefer)/.test(lower)) {
      gaps.push('Anthropic lab bias: little alignment/oversight vocabulary.')
    }
    if (state.lab === 'openai' && !/(ship|empiric|experiment|baseline|latency|throughput|test)/.test(lower)) {
      gaps.push('OpenAI lab bias: little shipped-empirics / test vocabulary.')
    }
    touchTool(state, 'critique_answer')
    return text({
      topic: topic.title,
      stage: state.stage,
      lab: state.lab,
      strengths: strengths.length ? strengths : ['Baseline clarity only — densify.'],
      gaps,
      hostInstruction:
        'Relay 1–2 strengths, then force the top gap with a concrete probe. Do not inflate praise. Offer Spinning Up / paper refs only if RL/opt is in play.',
      nextProbe: topic.probes[Math.min(1, topic.probes.length - 1)],
    })
  },
)

server.registerTool(
  'summarize_session',
  {
    title: 'Summarize harness session',
    description: 'Summarize current harness position vs the interview loop blueprint for coaching.',
    inputSchema: {},
  },
  async () => {
    const state = loadHarness()
    const topic = topicById(state.topicId)
    touchTool(state, 'summarize_session')
    return text({
      blueprintPointer: 'lattice://blueprint',
      harness: state,
      topic,
      coachingPlan: [
        `Stay on stage=${state.stage} until probes have mechanisms + falsifiers.`,
        cultureHint(state.lab),
        'If screening coding is weak, route to applet Coding mode (masked softmax / batcher / toy DB / 1NN-FFN).',
        'If theory RLHF is weak, use topic spinning-up-rl + Spinning Up refs.',
      ],
    })
  },
)

server.registerTool(
  'reset_harness',
  {
    title: 'Reset harness',
    description: 'Reset harness state to defaults (research-agenda screening).',
    inputSchema: {},
  },
  async () => {
    const fresh = defaultHarness()
    saveHarness(fresh)
    return text(fresh)
  },
)

function promptMessages(title: string, body: string) {
  return {
    description: title,
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: body,
        },
      },
    ],
  }
}

server.registerPrompt(
  'screen-research-agenda',
  {
    title: 'Screen — research agenda',
    description: 'Host prompt: screening research agenda / pubs / motivation',
    argsSchema: {
      focus: z.string().optional(),
    },
  },
  ({ focus }) =>
    promptMessages(
      'Screen research agenda',
      [
        'You are an elite RS screener (OpenAI/Anthropic bar).',
        'Call Lattice MCP `set_harness` topicId=research-agenda, then `start_round`.',
        'Interview the candidate: agenda → strongest paper stress test → why this lab.',
        focus ? `Focus: ${focus}` : '',
        'Reject fluff. Demand falsifiers.',
      ].join('\n'),
    ),
)

server.registerPrompt(
  'openai-ml-math-live',
  {
    title: 'OpenAI ML-math live',
    description: 'Host prompt for masked softmax / 1NN-in-FFN style live coding discussion',
    argsSchema: {},
  },
  () =>
    promptMessages(
      'OpenAI ML-math',
      [
        'Set harness topicId=openai-ml-math, lab=openai, style=whiteboard.',
        'Alternate: derive on whiteboard ↔ point candidate at Lattice Coding tasks (masked softmax, 1NN-FFN).',
        'Score numerics, masking correctness, and construction clarity.',
      ].join('\n'),
    ),
)

server.registerPrompt(
  'anthropic-coderpad',
  {
    title: 'Anthropic CodeSignal/CoderPad',
    description: 'Host prompt for batcher / toy DB / no-AI notebook discipline',
    argsSchema: {},
  },
  () =>
    promptMessages(
      'Anthropic coderpad',
      [
        'Set harness topicId=anthropic-coderpad, lab=anthropic, style=critique.',
        'Drive batcher + toy DB design; forbid hand-wavy concurrency.',
        'Pair with Lattice Coding tasks; insist on invariants and complexity.',
      ].join('\n'),
    ),
)

server.registerPrompt(
  'openai-work-trial',
  {
    title: 'OpenAI 48h work-trial coach',
    description: 'Mid-loop empirics / speed / uncertainty',
    argsSchema: {
      project: z.string().optional(),
    },
  },
  ({ project }) =>
    promptMessages(
      'Work trial',
      [
        'set_harness topicId=openai-work-trial lab=openai depth=deep style=critique',
        'Coach a 48h plan: hour-8 kill criterion, tests, uncertainty reporting.',
        project ? `Project framing: ${project}` : 'Ask candidate for a concrete mini-project.',
      ].join('\n'),
    ),
)

server.registerPrompt(
  'anthropic-research-day',
  {
    title: 'Anthropic research day',
    description: '4–5h experiment design + trade-off writeup coaching',
    argsSchema: {},
  },
  () =>
    promptMessages(
      'Research day',
      [
        'set_harness topicId=anthropic-research-day lab=anthropic style=defense depth=deep',
        'Force a decision memo: options, axes, measurements, non-goals, academic refs.',
        'Interrupt mid-answer; see what they protect first.',
      ].join('\n'),
    ),
)

server.registerPrompt(
  'onsite-defense',
  {
    title: 'Onsite interrupted defense',
    description: 'Interrupted research defense round',
    argsSchema: {
      thesis: z.string().optional(),
    },
  },
  ({ thesis }) =>
    promptMessages(
      'Onsite defense',
      [
        'set_harness topicId=onsite-defense style=defense depth=deep',
        thesis ? `Candidate thesis hint: ${thesis}` : 'Elicit a 90s thesis first.',
        'Then probe → systems cut → falsifier. Use `probe` modes.',
      ].join('\n'),
    ),
)

server.registerPrompt(
  'mission-gate',
  {
    title: 'Mission alignment gatekeeper',
    description: 'Anthropic CAI/oversight or OpenAI Charter/honesty',
    argsSchema: {
      lab: z.enum(['openai', 'anthropic']),
    },
  },
  ({ lab }) =>
    promptMessages(
      'Mission gate',
      [
        lab === 'anthropic'
          ? 'set_harness topicId=mission-anthropic lab=anthropic'
          : 'set_harness topicId=mission-openai lab=openai',
        'This is a gatekeeper round. Soft ethics platitudes fail.',
        'Use critique_answer on each response; finish with summarize_session.',
      ].join('\n'),
    ),
)

server.registerPrompt(
  'theory-spinning-up',
  {
    title: 'Theory round — Spinning Up / PG / KL',
    description: 'Drill policy gradients and KL for RLHF-adjacent depth',
    argsSchema: {},
  },
  () =>
    promptMessages(
      'Theory RL',
      [
        'set_harness topicId=spinning-up-rl style=socratic depth=deep',
        'Lean on Spinning Up: policy gradient, baselines, PPO clip vs KL.',
        'Connect to reward-model noise in RLHF; no vibes.',
      ].join('\n'),
    ),
)

async function main() {
  loadHarness()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`lattice-harness MCP on stdio · state ${HARNESS_PATH}`)
}

main()
