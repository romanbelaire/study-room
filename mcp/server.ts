#!/usr/bin/env node
/**
 * Lattice discussion + curriculum MCP server for RS interview prep.
 * In-app Discussion chat runs tool hooks locally; MCP hosts can also drain
 * pending messages and post replies, and fulfill/enrich generated MCQ sets.
 *
 * Log only on stderr — stdout is JSON-RPC.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  generationBrief,
  listGeneratedCoding,
  listGeneratedMcqs,
  saveCodingTasks,
  saveMcqs,
} from '../server/content.ts'
import {
  createTopic,
  ensureSeedTopics,
  getJourney,
  listTopics as listStudyTopics,
  openTopicSession,
  recordOutcome,
  setBucket,
} from '../server/store.ts'
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

server.registerResource(
  'study-topics',
  'lattice://study-topics',
  {
    title: 'Learner study topics',
    description: 'Arbitrary user-defined topic tabs (not only RS seed drills)',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(await listStudyTopics(), null, 2),
        mimeType: 'application/json',
      },
    ],
  }),
)

server.registerResource(
  'journey',
  'lattice://journey',
  {
    title: 'Learner journey',
    description: 'Struggles, quick-forget, and confirmed knowledge bank',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(await getJourney('local-learner'), null, 2),
        mimeType: 'application/json',
      },
    ],
  }),
)

server.registerResource(
  'first-connect-skill',
  'lattice://skill/first-connect',
  {
    title: 'Agent first-connect skill',
    description: 'Title rename + What are you studying? prefill for any topic',
    mimeType: 'text/markdown',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: readFileSync(resolve(process.cwd(), 'skills/first-connect.md'), 'utf8'),
        mimeType: 'text/markdown',
      },
    ],
  }),
)

server.registerTool(
  'list_study_topics',
  {
    title: 'List study topics',
    description: 'List arbitrary learner topic tabs (create your own; not limited to RS seeds).',
    inputSchema: {
      learnerId: z.string().optional().describe('Local MCP learner key; defaults to mcp-local'),
    },
  },
  async ({ learnerId }) => text(await listStudyTopics(learnerId ?? 'mcp-local')),
)

server.registerTool(
  'create_study_topic',
  {
    title: 'Create study topic',
    description: 'Create an arbitrary topic tab by title (owned by learnerId).',
    inputSchema: {
      title: z.string(),
      notes: z.string().optional(),
      learnerId: z.string().optional(),
    },
  },
  async ({ title, notes, learnerId }) =>
    text(await createTopic(title, notes ?? '', learnerId ?? 'mcp-local')),
)

server.registerTool(
  'open_topic',
  {
    title: 'Open topic (first-connect)',
    description:
      'First-connect skill for a topic tab: returns suggestedChatTitle and prefillMessage (“What are you studying?”). Host must apply title+prefill, then call again with acknowledge=true.',
    inputSchema: {
      topicId: z.string(),
      acknowledge: z.boolean().optional(),
      learnerId: z.string().optional(),
    },
  },
  async ({ topicId, acknowledge, learnerId }) =>
    text(await openTopicSession(topicId, Boolean(acknowledge), learnerId ?? 'mcp-local')),
)

server.registerTool(
  'get_journey',
  {
    title: 'Get learner journey',
    description: 'Read struggles, quick-forget, and confirmed knowledge for a learner/topic.',
    inputSchema: {
      learnerId: z.string().optional(),
      topicId: z.string().optional(),
    },
  },
  async ({ learnerId, topicId }) =>
    text(await getJourney(learnerId ?? 'mcp-local', topicId)),
)

server.registerTool(
  'record_outcome',
  {
    title: 'Record study outcome',
    description: 'Record MCQ/coding/custom outcome; updates struggle / quick-forget / confirmed buckets.',
    inputSchema: {
      learnerId: z.string().optional(),
      topicId: z.string(),
      kind: z.enum(['mcq', 'coding', 'concept', 'custom']),
      itemKey: z.string(),
      label: z.string(),
      outcome: z.enum(['correct', 'wrong', 'pass', 'fail']),
      notes: z.string().optional(),
    },
  },
  async (args) =>
    text(
      await recordOutcome({
        learnerId: args.learnerId ?? 'mcp-local',
        topicId: args.topicId,
        kind: args.kind,
        itemKey: args.itemKey,
        label: args.label,
        outcome: args.outcome,
        notes: args.notes,
      }),
    ),
)

server.registerTool(
  'set_journey_bucket',
  {
    title: 'Set journey bucket',
    description: 'Manually place an item into struggle | quick_forget | confirmed.',
    inputSchema: {
      learnerId: z.string().optional(),
      topicId: z.string(),
      kind: z.enum(['mcq', 'coding', 'concept', 'custom']),
      itemKey: z.string(),
      label: z.string(),
      bucket: z.enum(['struggle', 'quick_forget', 'confirmed']),
      notes: z.string().optional(),
    },
  },
  async (args) =>
    text(
      await setBucket({
        learnerId: args.learnerId ?? 'mcp-local',
        topicId: args.topicId,
        kind: args.kind,
        itemKey: args.itemKey,
        label: args.label,
        bucket: args.bucket,
        notes: args.notes,
      }),
    ),
)

const mcqItem = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  question: z.string(),
  choices: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
})

const codingItem = z.object({
  title: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  prompt: z.string(),
  starter: z.string(),
  hint: z.string(),
  solution: z.string(),
  checkFn: z.string(),
})

server.registerTool(
  'get_generation_brief',
  {
    title: 'Generation brief',
    description:
      'Instructions + schema to author a frontier MCQ/coding set for a topic. Enforces mcq-authoring distractor parity.',
    inputSchema: {
      topicId: z.string(),
      learnerId: z.string().optional(),
    },
  },
  async ({ topicId, learnerId }) => {
    const lid = learnerId ?? 'mcp-local'
    const topics = await listStudyTopics(lid)
    const topic = topics.find((t) => t.id === topicId)
    if (!topic) throw new Error(`Unknown or inaccessible topic ${topicId}`)
    return text({
      ...generationBrief(topic.title, topic.id),
      skill: readFileSync(resolve(process.cwd(), 'skills/generate-set.md'), 'utf8'),
      mcqAuthoring: readFileSync(resolve(process.cwd(), 'skills/mcq-authoring.md'), 'utf8'),
    })
  },
)

server.registerTool(
  'save_mcqs',
  {
    title: 'Save generated MCQs',
    description:
      'Persist agent-authored MCQs for a topic (Postgres/PGlite). Rejects distractor length parity failures.',
    inputSchema: {
      topicId: z.string(),
      items: z.array(mcqItem).min(1),
      learnerId: z.string().optional(),
    },
  },
  async ({ topicId, items, learnerId }) =>
    text(await saveMcqs(topicId, learnerId ?? 'mcp-local', items)),
)

server.registerTool(
  'save_coding_tasks',
  {
    title: 'Save generated coding tasks',
    description: 'Persist agent-authored coding drills (solve + check) for a topic.',
    inputSchema: {
      topicId: z.string(),
      items: z.array(codingItem).min(1),
      learnerId: z.string().optional(),
    },
  },
  async ({ topicId, items, learnerId }) =>
    text(await saveCodingTasks(topicId, learnerId ?? 'mcp-local', items)),
)

server.registerTool(
  'list_topic_content',
  {
    title: 'List topic content',
    description: 'List generated MCQs and coding tasks the UI will prefer over seeds.',
    inputSchema: {
      topicId: z.string(),
      learnerId: z.string().optional(),
    },
  },
  async ({ topicId, learnerId }) => {
    const lid = learnerId ?? 'mcp-local'
    const mcqs = await listGeneratedMcqs(topicId, lid)
    const coding = await listGeneratedCoding(topicId, lid)
    return text({ mcqs, coding, preferGenerated: mcqs.length > 0 || coding.length > 0 })
  },
)

server.registerTool(
  'ensure_mcq_curriculum',
  {
    title: 'Ensure MCQ curriculum',
    description:
      'Proactively ensure a persisted generated MCQ set for a topic (bootstrap or top-up). Seeds are only a cold UI fallback.',
    inputSchema: {
      topicId: z.string(),
      learnerId: z.string().optional(),
      reason: z.string().optional(),
      topUp: z.boolean().optional(),
    },
  },
  async ({ topicId, learnerId, reason, topUp }) => {
    const { ensureMcqCurriculum } = await import('../server/generation.ts')
    return text(
      await ensureMcqCurriculum({
        topicId,
        learnerId: learnerId ?? 'mcp-local',
        reason: reason ?? 'mcp-ensure',
        topUp: Boolean(topUp),
      }),
    )
  },
)

server.registerTool(
  'list_pending_discussion',
  {
    title: 'List pending discussion messages',
    description:
      'User messages in the Lattice in-app chat that still need an assistant reply (for host agents that co-drive Discussion).',
    inputSchema: {
      learnerId: z.string().optional(),
    },
  },
  async ({ learnerId }) => {
    const { listPendingUserMessages } = await import('../server/discussion.ts')
    return text(await listPendingUserMessages(learnerId))
  },
)

server.registerTool(
  'post_discussion_reply',
  {
    title: 'Post discussion reply',
    description: 'Post an assistant message into the Lattice in-app Discussion thread.',
    inputSchema: {
      topicId: z.string(),
      content: z.string(),
      learnerId: z.string().optional(),
    },
  },
  async ({ topicId, content, learnerId }) => {
    const { appendDiscussionMessage, listDiscussionMessages } = await import(
      '../server/discussion.ts'
    )
    const lid = learnerId ?? 'mcp-local'
    await appendDiscussionMessage({
      topicId,
      learnerId: lid,
      role: 'assistant',
      content,
    })
    return text({ messages: await listDiscussionMessages(topicId, lid) })
  },
)

server.registerTool(
  'get_discussion_thread',
  {
    title: 'Get discussion thread',
    description: 'Fetch the in-app Discussion transcript for a topic/learner.',
    inputSchema: {
      topicId: z.string(),
      learnerId: z.string().optional(),
    },
  },
  async ({ topicId, learnerId }) => {
    const { listDiscussionMessages } = await import('../server/discussion.ts')
    return text(await listDiscussionMessages(topicId, learnerId ?? 'mcp-local'))
  },
)

server.registerResource(
  'generate-set-skill',
  'lattice://skill/generate-set',
  {
    title: 'Generate study set skill',
    description: 'How the host agent authors and saves frontier MCQs/coding tasks',
    mimeType: 'text/markdown',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: readFileSync(resolve(process.cwd(), 'skills/generate-set.md'), 'utf8'),
        mimeType: 'text/markdown',
      },
    ],
  }),
)

server.registerPrompt(
  'first-connect',
  {
    title: 'Agent first-connect',
    description: 'Rename chat, prefill What are you studying?, then generate a set',
    argsSchema: {
      topicId: z.string().optional(),
      topicTitle: z.string().optional(),
    },
  },
  ({ topicId, topicTitle }) =>
    promptMessages(
      'First connect',
      [
        'Follow lattice://skill/first-connect then lattice://skill/generate-set.',
        topicId
          ? `Call open_topic with topicId=${topicId}.`
          : topicTitle
            ? `create_study_topic title="${topicTitle}", then open_topic.`
            : 'list_study_topics, then open_topic for the active tab.',
        'Set chat title to suggestedChatTitle.',
        'Prefill exactly: What are you studying?',
        'acknowledge=true after applying.',
        'After the learner answers, get_generation_brief → save_mcqs (parity!) → optional save_coding_tasks.',
      ].join('\n'),
    ),
)

server.registerPrompt(
  'generate-set',
  {
    title: 'Generate study set',
    description: 'Author and persist frontier MCQs/coding for the active topic',
    argsSchema: {
      topicId: z.string(),
    },
  },
  ({ topicId }) =>
    promptMessages(
      'Generate set',
      [
        'Follow lattice://skill/generate-set and skills/mcq-authoring.md.',
        `get_generation_brief topicId=${topicId}`,
        'Author 5–10 parallel-option MCQs; save_mcqs.',
        'Optionally 1–3 coding tasks; save_coding_tasks.',
        'list_topic_content to confirm.',
      ].join('\n'),
    ),
)

async function main() {
  loadHarness()
  await ensureSeedTopics()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`lattice-harness MCP on stdio · state ${HARNESS_PATH}`)
}

main()
