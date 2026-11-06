/** Canonical loop content shared by MCP harness (mirrors docs/interview-loop-blueprint). */

export const BLUEPRINT = `# OpenAI / Anthropic RS interview loop (Lattice)

Rigor: <1% acceptance bar — elite technical depth, no fluff. Prefer Spinning Up / primary papers.

## Screening
- Shared: research agenda, pubs, motivation (claim → evidence → limitation; why this lab).
- Anthropic CodeSignal/CoderPad-style: batcher, toy DB, no-AI notebook discipline.
- OpenAI live ML-math coding: masked softmax, 1NN-in-FFN-style constructions, stable numerics.

## Mid-stage
- OpenAI ~48h work-trial: speed, tests, empirical uncertainty; ship with honest failure modes.
- Anthropic 4–5h research day: experiment design + trade-off writeup; taste under interruption.

## Onsite
- Interrupted research defense; falsifiers in ≤ eng-weeks.
- ML systems: scaling laws, inference (KV/batching/spec decode), GPU scheduling, safety layers.
- Mission gatekeepers:
  - Anthropic: Constitutional AI, reward hacking, scalable oversight.
  - OpenAI: Charter judgment, intellectual honesty, collab friction.

## Culture
- OpenAI: speed, execution, shipped empirics.
- Anthropic: alignment philosophy, research taste, peer collab + mid-loop academic refs.
`

export type Lab = 'openai' | 'anthropic' | 'either'
export type Stage = 'screening' | 'mid' | 'onsite' | 'culture'
export type Depth = 'screen' | 'deep'
export type Style = 'socratic' | 'critique' | 'whiteboard' | 'defense'

export type DrillTopic = {
  id: string
  title: string
  stage: Stage
  lab: Lab
  blurb: string
  probes: string[]
  refs: string[]
}

export const DRILL_TOPICS: DrillTopic[] = [
  {
    id: 'research-agenda',
    title: 'Research agenda / pubs / motivation',
    stage: 'screening',
    lab: 'either',
    blurb: 'Screening narrative with technical spine — not biography.',
    probes: [
      'State your agenda as a falsifiable research program for the next 12 months.',
      'Which result in your strongest paper would change if one modeling assumption failed?',
      'Why this lab’s stack/mission is a forcing function for that program — be specific.',
    ],
    refs: ['Your papers', 'Lab recent work (cite 1–2)'],
  },
  {
    id: 'anthropic-coderpad',
    title: 'Anthropic CodeSignal / CoderPad drills',
    stage: 'screening',
    lab: 'anthropic',
    blurb: 'Batcher, toy DB, notebook-without-AI discipline under time.',
    probes: [
      'Design a request batcher: correctness under concurrency, latency vs throughput tradeoff.',
      'Toy DB: indexes, isolation level you actually implement, failure on crash mid-write.',
      'What do you verify without an LLM autocomplete — invariants, complexity, edge cases?',
    ],
    refs: ['Systems interview classics', 'Isolation levels cheatsheet'],
  },
  {
    id: 'openai-ml-math',
    title: 'OpenAI live ML-math coding',
    stage: 'screening',
    lab: 'openai',
    blurb: 'Masked softmax, 1NN-in-FFN constructions, stable training snippets.',
    probes: [
      'Implement causal/masked softmax; prove rows still normalize; discuss -inf vs large negative.',
      'How can a shallow ReLU FFN approximate 1-nearest-neighbor in a finite set? Sketch construction.',
      'Where do mixed-precision and FlashAttention change the numerics story?',
    ],
    refs: ['Attention is All You Need', 'FFN / memorization constructions in lit'],
  },
  {
    id: 'openai-work-trial',
    title: 'OpenAI 48h work-trial empirics',
    stage: 'mid',
    lab: 'openai',
    blurb: 'Speed, tests, empirical uncertainty — shipped measurement over slides.',
    probes: [
      'Scope a 48h experiment with a kill criterion at hour 8.',
      'What tests/asserts catch silent training bugs before you trust a curve?',
      'How do you report uncertainty when n is small and the baseline is noisy?',
    ],
    refs: ['Experiment design notes', 'Your prior empirical writeups'],
  },
  {
    id: 'anthropic-research-day',
    title: 'Anthropic research day (4–5h)',
    stage: 'mid',
    lab: 'anthropic',
    blurb: 'Experiment design + trade-off writeup; peer-grade clarity.',
    probes: [
      'Write the decision memo: options, axes, what you would measure, what you would not.',
      'Under interruption, which claim do you defend first and why?',
      'Name the academic mid-loop references a strong peer would expect.',
    ],
    refs: ['Lab-style research memos', 'Related work hygiene'],
  },
  {
    id: 'onsite-defense',
    title: 'Interrupted research defense',
    stage: 'onsite',
    lab: 'either',
    blurb: 'Hold a thesis while probes land; know falsifiers.',
    probes: [
      'Give the 90-second thesis. Pause. Take the hardest objection.',
      'What experiment falsifies you in ≤ two eng-weeks?',
      'Where is your result brittle to data contamination or eval leakage?',
    ],
    refs: ['Your job talk spine'],
  },
  {
    id: 'ml-systems',
    title: 'ML systems (scale / infer / schedule / safety layers)',
    stage: 'onsite',
    lab: 'either',
    blurb: 'Scaling laws, inference, GPU scheduling, safety in the serving path.',
    probes: [
      'Allocate tokens vs params under a FLOP budget; when Chinchilla-style advice breaks.',
      'KV cache memory for long context + continuous batching interaction.',
      'Where do safety filters/refusal layers sit relative to speculative decoding and caching?',
    ],
    refs: ['Hoffmann et al.', 'Inference systems papers', 'Serving stack diagrams'],
  },
  {
    id: 'mission-anthropic',
    title: 'Mission — Constitutional AI / reward hacking / oversight',
    stage: 'onsite',
    lab: 'anthropic',
    blurb: 'Gatekeeper: alignment philosophy with technical teeth.',
    probes: [
      'Contrast constitution+critique vs preference-model RLHF; failure modes of each.',
      'Concrete reward-hacking story and an eval that would have caught it earlier.',
      'Scalable oversight: what still requires humans, and how do you measure overseer error?',
    ],
    refs: ['Constitutional AI', 'Reward hacking literature', 'Scalable oversight surveys'],
  },
  {
    id: 'mission-openai',
    title: 'Mission — Charter / honesty / collab friction',
    stage: 'onsite',
    lab: 'openai',
    blurb: 'Gatekeeper: intellectual honesty and execution under disagreement.',
    probes: [
      'Describe a time empirics forced you to kill a beloved idea — what did you ship instead?',
      'How do you handle collab friction when speed and correctness disagree?',
      'Charter-shaped judgment: capability vs safety tension on a concrete project choice.',
    ],
    refs: ['OpenAI Charter', 'Your conflict/postmortem examples'],
  },
  {
    id: 'culture-contrast',
    title: 'Culture differentials',
    stage: 'culture',
    lab: 'either',
    blurb: 'OpenAI speed/empirics vs Anthropic taste/alignment/refs.',
    probes: [
      'Rewrite the same result as an OpenAI-style shipped empirics note vs Anthropic-style taste memo.',
      'Which loop stage would reject you for fluff even if the idea is good?',
      'What mid-loop academic reference would Anthropic peers expect that OpenAI might deprioritize?',
    ],
    refs: ['Lab public writing norms'],
  },
  {
    id: 'spinning-up-rl',
    title: 'Theory — Spinning Up / policy gradients / KL',
    stage: 'screening',
    lab: 'either',
    blurb: 'Open materials for RLHF-adjacent theory depth.',
    probes: [
      'Derive the policy gradient theorem sketch; where does the baseline enter?',
      'PPO’s clipped objective vs TRPO’s constraint — what breaks if β/KL is wrong?',
      'Connect advantage estimation quality to reward-model noise in RLHF.',
    ],
    refs: ['Spinning Up in Deep RL', 'Schulman PPO/TRPO', 'RLHF surveys'],
  },
]

export type HarnessState = {
  topicId: string
  stage: Stage
  lab: Lab
  depth: Depth
  style: Style
  focusNotes: string
  round: number
  lastTool: string | null
  lastProbe: string | null
  updatedAt: string
}

export function defaultHarness(): HarnessState {
  return {
    topicId: 'research-agenda',
    stage: 'screening',
    lab: 'either',
    depth: 'screen',
    style: 'socratic',
    focusNotes: '',
    round: 0,
    lastTool: null,
    lastProbe: null,
    updatedAt: new Date().toISOString(),
  }
}

export function topicById(id: string): DrillTopic {
  const t = DRILL_TOPICS.find((x) => x.id === id)
  if (!t) throw new Error(`Unknown topic id: ${id}`)
  return t
}
