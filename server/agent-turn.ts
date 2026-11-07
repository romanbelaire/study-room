import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { appendDiscussionMessage, listDiscussionMessages } from './discussion.ts'
import { generationBrief, listGeneratedMcqs, saveMcqs } from './content.ts'
import { ensureMcqCurriculum, synthesizeMcqsForTopic } from './generation.ts'
import { getJourney, listTopics } from './store.ts'

const HARNESS_PATH = resolve(process.cwd(), '.lattice/harness-state.json')

export type HarnessConfig = {
  topicId: string
  stage: string
  lab: string
  depth: string
  style: string
  focusNotes: string
  round: number
}

function loadHarness(): HarnessConfig {
  const fallback: HarnessConfig = {
    topicId: 'research-agenda',
    stage: 'screening',
    lab: 'either',
    depth: 'screen',
    style: 'socratic',
    focusNotes: '',
    round: 0,
  }
  if (!existsSync(HARNESS_PATH)) return fallback
  return { ...fallback, ...(JSON.parse(readFileSync(HARNESS_PATH, 'utf8')) as object) }
}

type ToolResult = { name: string; ok: boolean; summary: string; data?: unknown }

/** Tool-call surface shared by in-app discussion turns (and mirrored in MCP). */
export async function runDiscussionTools(
  learnerId: string,
  topicId: string,
  calls: Array<{ name: string; args?: Record<string, unknown> }>,
): Promise<ToolResult[]> {
  const out: ToolResult[] = []
  for (const call of calls) {
    try {
      if (call.name === 'get_harness') {
        const harness = loadHarness()
        out.push({ name: call.name, ok: true, summary: 'harness loaded', data: harness })
      } else if (call.name === 'get_journey') {
        const journey = await getJourney(learnerId, topicId)
        out.push({
          name: call.name,
          ok: true,
          summary: `struggles=${journey.struggles.length} quick=${journey.quickForget.length}`,
          data: journey,
        })
      } else if (call.name === 'get_generation_brief') {
        const topics = await listTopics(learnerId)
        const topic = topics.find((t) => t.id === topicId)
        const brief = generationBrief(topic?.title ?? 'topic', topicId)
        out.push({ name: call.name, ok: true, summary: 'brief ready', data: brief })
      } else if (call.name === 'ensure_mcq_curriculum') {
        const result = await ensureMcqCurriculum({
          topicId,
          learnerId,
          reason: String(call.args?.reason ?? 'discussion-tool'),
          topUp: Boolean(call.args?.topUp),
        })
        out.push({
          name: call.name,
          ok: true,
          summary: `status=${result.status} count=${result.generatedCount}`,
          data: result,
        })
      } else if (call.name === 'save_mcqs') {
        const items = (call.args?.items as Array<{
          difficulty: string
          question: string
          choices: string[]
          answerIndex: number
          explanation: string
        }>) ?? []
        const saved = await saveMcqs(topicId, learnerId, items)
        out.push({
          name: call.name,
          ok: true,
          summary: `saved ${saved.length}`,
          data: { saved: saved.length },
        })
      } else if (call.name === 'list_topic_mcqs') {
        const generated = await listGeneratedMcqs(topicId, learnerId)
        out.push({
          name: call.name,
          ok: true,
          summary: `${generated.length} generated`,
          data: { count: generated.length },
        })
      } else {
        out.push({ name: call.name, ok: false, summary: `unknown tool ${call.name}` })
      }
    } catch (err) {
      out.push({
        name: call.name,
        ok: false,
        summary: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return out
}

function styleOpener(harness: HarnessConfig, topicTitle: string): string {
  const focus = harness.focusNotes.trim()
  const focusBit = focus ? ` Focus notes: ${focus}` : ''
  if (harness.style === 'critique') {
    return `Paper-review mode (${harness.stage}/${harness.lab}, ${harness.depth}). State a claim about ${topicTitle} with one ablation you’d demand.${focusBit}`
  }
  if (harness.style === 'whiteboard') {
    return `Whiteboard mode. Diagram the data/control path for ${topicTitle} in 4–6 boxes; name the bottleneck.${focusBit}`
  }
  if (harness.style === 'defense') {
    return `Defense mode. I’ll grant your thesis on ${topicTitle}, then attack one joint. What’s the thesis in one sentence?${focusBit}`
  }
  return `Socratic (${harness.depth}). What are you studying in ${topicTitle}, and what would falsify your current mental model?${focusBit}`
}

function replyFromTools(
  harness: HarnessConfig,
  topicTitle: string,
  userText: string,
  tools: ToolResult[],
): string {
  const ensure = tools.find((t) => t.name === 'ensure_mcq_curriculum' && t.ok)
  const journey = tools.find((t) => t.name === 'get_journey' && t.ok)
  const parts: string[] = []

  if (harness.style === 'socratic') {
    parts.push(
      `You said: “${userText.slice(0, 220)}”. Why does that mechanism hold under a distribution shift for ${topicTitle}?`,
    )
  } else if (harness.style === 'critique') {
    parts.push(
      `Critique pass: the weakest joint in “${userText.slice(0, 160)}” is underspecified evaluation. Name the metric and the confound.`,
    )
  } else if (harness.style === 'whiteboard') {
    parts.push(
      `Pin that on the board. Where does memory traffic dominate for ${topicTitle}, given what you just said?`,
    )
  } else {
    parts.push(
      `Granted for a moment. Attack: which assumption in “${userText.slice(0, 160)}” fails first in production?`,
    )
  }

  if (ensure?.data && typeof ensure.data === 'object') {
    const d = ensure.data as { generatedCount?: number; status?: string }
    parts.push(
      `(tool ensure_mcq_curriculum → ${d.status ?? 'ok'}, ${d.generatedCount ?? '?'} persisted MCQs for Knowledge.)`,
    )
  }
  if (journey?.data && typeof journey.data === 'object') {
    const j = journey.data as {
      struggles?: unknown[]
      quickForget?: unknown[]
    }
    const s = j.struggles?.length ?? 0
    const q = j.quickForget?.length ?? 0
    if (s || q) {
      parts.push(`Journey signal: ${s} struggles, ${q} quick-forget — we should probe those next.`)
    }
  }

  const failed = tools.filter((t) => !t.ok)
  if (failed.length) {
    parts.push(`Tool issues: ${failed.map((t) => `${t.name}: ${t.summary}`).join('; ')}`)
  }
  return parts.join('\n\n')
}

/**
 * In-app discussion turn: persist user message, run tool hooks, persist assistant reply.
 * MCP hosts can also drain pending users via discussion tools and post_assistant_reply.
 */
export async function runInAppDiscussionTurn(input: {
  topicId: string
  topicTitle: string
  learnerId: string
  userText: string
}): Promise<{ messages: Awaited<ReturnType<typeof listDiscussionMessages>>; tools: ToolResult[] }> {
  const text = input.userText.trim()
  if (!text) throw new Error('empty message')

  await appendDiscussionMessage({
    topicId: input.topicId,
    learnerId: input.learnerId,
    role: 'user',
    content: text,
  })

  const harness = loadHarness()
  const toolPlan: Array<{ name: string; args?: Record<string, unknown> }> = [
    { name: 'get_harness' },
    { name: 'get_journey' },
    { name: 'list_topic_mcqs' },
  ]

  // Proactively refresh curriculum when the learner discusses the topic or asks for questions.
  if (/mcq|question|quiz|curriculum|generate|study set/i.test(text) || harness.round % 3 === 0) {
    toolPlan.push({
      name: 'ensure_mcq_curriculum',
      args: { reason: 'discussion-turn', topUp: true },
    })
  }

  const tools = await runDiscussionTools(input.learnerId, input.topicId, toolPlan)

  for (const t of tools) {
    await appendDiscussionMessage({
      topicId: input.topicId,
      learnerId: input.learnerId,
      role: 'tool',
      content: t.summary,
      toolName: t.name,
      toolPayload: { ok: t.ok, data: t.data },
    })
  }

  const reply =
    text.toLowerCase() === '/open' || text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello'
      ? styleOpener(harness, input.topicTitle)
      : replyFromTools(harness, input.topicTitle, text, tools)

  await appendDiscussionMessage({
    topicId: input.topicId,
    learnerId: input.learnerId,
    role: 'assistant',
    content: reply,
  })

  const messages = await listDiscussionMessages(input.topicId, input.learnerId)
  return { messages, tools }
}

export async function ensureOpeningAssistantMessage(input: {
  topicId: string
  topicTitle: string
  learnerId: string
}): Promise<void> {
  const existing = await listDiscussionMessages(input.topicId, input.learnerId, 5)
  if (existing.some((m) => m.role === 'assistant' || m.role === 'user')) return
  const harness = loadHarness()
  await appendDiscussionMessage({
    topicId: input.topicId,
    learnerId: input.learnerId,
    role: 'assistant',
    content: styleOpener(harness, input.topicTitle),
  })
  // Kick curriculum on discussion open as well
  await ensureMcqCurriculum({
    topicId: input.topicId,
    learnerId: input.learnerId,
    reason: 'discussion-open',
  })
}

export { loadHarness, synthesizeMcqsForTopic }
