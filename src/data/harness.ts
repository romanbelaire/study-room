/** Applet-facing catalog mirroring mcp/blueprint.ts (keep in sync). */

export type Lab = 'openai' | 'anthropic' | 'either'
export type Stage = 'screening' | 'mid' | 'onsite' | 'culture'
export type Depth = 'screen' | 'deep'
export type Style = 'socratic' | 'critique' | 'whiteboard' | 'defense'

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

export const TOOL_CATALOG = [
  { name: 'list_topics', use: 'List RS drills by stage/lab' },
  { name: 'list_study_topics', use: 'List arbitrary topic tabs' },
  { name: 'create_study_topic', use: 'Create a topic tab' },
  { name: 'open_topic', use: 'First-connect title + prefill' },
  { name: 'get_generation_brief', use: 'Brief to author frontier set' },
  { name: 'save_mcqs', use: 'Persist generated MCQs (parity check)' },
  { name: 'save_coding_tasks', use: 'Persist generated coding drills' },
  { name: 'list_topic_content', use: 'List generated content for a topic' },
  { name: 'get_journey', use: 'Struggles / quick-forget / confirmed' },
  { name: 'record_outcome', use: 'Write MCQ/coding outcome' },
  { name: 'set_journey_bucket', use: 'Manual bucket placement' },
  { name: 'get_harness', use: 'Read harness state' },
  { name: 'set_harness', use: 'Set stage/lab/depth/style/focus' },
  { name: 'start_round', use: 'Open host-agent round brief' },
  { name: 'probe', use: 'followup | harder | systems | mission | falsifier' },
  { name: 'critique_answer', use: 'Rigor scaffold on an answer' },
  { name: 'summarize_session', use: 'Loop-position coaching plan' },
  { name: 'reset_harness', use: 'Back to defaults' },
] as const

export const PROMPT_CATALOG = [
  'first-connect',
  'generate-set',
  'screen-research-agenda',
  'openai-ml-math-live',
  'anthropic-coderpad',
  'openai-work-trial',
  'anthropic-research-day',
  'onsite-defense',
  'mission-gate',
  'theory-spinning-up',
] as const

export const RESOURCE_CATALOG = [
  { uri: 'lattice://blueprint', name: 'Interview loop blueprint' },
  { uri: 'lattice://harness', name: 'Live harness JSON' },
  { uri: 'lattice://topics', name: 'Drill topic catalog' },
  { uri: 'lattice://study-topics', name: 'Learner topic tabs' },
  { uri: 'lattice://journey', name: 'Learner journey banks' },
  { uri: 'lattice://skill/first-connect', name: 'First-connect skill' },
  { uri: 'lattice://skill/generate-set', name: 'Generate-set skill' },
] as const

export const TOPICS = [
  { id: 'research-agenda', title: 'Research agenda / pubs / motivation', stage: 'screening' as Stage, lab: 'either' as Lab },
  { id: 'anthropic-coderpad', title: 'Anthropic CodeSignal / CoderPad', stage: 'screening' as Stage, lab: 'anthropic' as Lab },
  { id: 'openai-ml-math', title: 'OpenAI live ML-math', stage: 'screening' as Stage, lab: 'openai' as Lab },
  { id: 'openai-work-trial', title: 'OpenAI 48h work-trial', stage: 'mid' as Stage, lab: 'openai' as Lab },
  { id: 'anthropic-research-day', title: 'Anthropic research day', stage: 'mid' as Stage, lab: 'anthropic' as Lab },
  { id: 'onsite-defense', title: 'Interrupted research defense', stage: 'onsite' as Stage, lab: 'either' as Lab },
  { id: 'ml-systems', title: 'ML systems', stage: 'onsite' as Stage, lab: 'either' as Lab },
  { id: 'mission-anthropic', title: 'Mission — CAI / hacking / oversight', stage: 'onsite' as Stage, lab: 'anthropic' as Lab },
  { id: 'mission-openai', title: 'Mission — Charter / honesty / collab', stage: 'onsite' as Stage, lab: 'openai' as Lab },
  { id: 'culture-contrast', title: 'Culture differentials', stage: 'culture' as Stage, lab: 'either' as Lab },
  { id: 'spinning-up-rl', title: 'Theory — Spinning Up / PG / KL', stage: 'screening' as Stage, lab: 'either' as Lab },
]

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

export function cursorMcpSnippet(repoRoot = '/absolute/path/to/lattice'): string {
  return JSON.stringify(
    {
      mcpServers: {
        lattice: {
          command: 'npx',
          args: ['tsx', 'mcp/server.ts'],
          cwd: repoRoot,
        },
      },
    },
    null,
    2,
  )
}
