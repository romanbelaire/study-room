import { randomUUID } from 'node:crypto'
import { sql } from './db.ts'
import { listGeneratedMcqs, saveMcqs } from './content.ts'
import { assertTopicAccess, type Topic } from './store.ts'

export type GenerationJob = {
  id: string
  topic_id: string
  learner_id: string
  kind: 'mcq_bootstrap' | 'mcq_topup'
  status: 'pending' | 'running' | 'done' | 'failed'
  reason: string
  detail: string
  created_at: string
  updated_at: string
}

const MIN_BOOTSTRAP = 6
const TOPUP_THRESHOLD = 3

async function topicFor(topicId: string, learnerId: string): Promise<Topic> {
  const rows = await sql<Topic>('select * from topics where id = $1', [topicId])
  if (!rows[0]) throw new Error(`Unknown topic ${topicId}`)
  assertTopicAccess(rows[0], learnerId, false)
  return rows[0]
}

export async function listPendingGenerationJobs(): Promise<GenerationJob[]> {
  return sql<GenerationJob>(
    `select * from generation_jobs
     where status = 'pending'
     order by created_at asc
     limit 20`,
  )
}

export async function claimGenerationJob(
  jobId: string,
): Promise<GenerationJob | null> {
  const rows = await sql<GenerationJob>(
    `update generation_jobs
     set status = 'running', updated_at = now()
     where id = $1 and status = 'pending'
     returning *`,
    [jobId],
  )
  return rows[0] ?? null
}

export async function finishGenerationJob(
  jobId: string,
  status: 'done' | 'failed',
  detail = '',
): Promise<void> {
  await sql(
    `update generation_jobs
     set status = $2, detail = $3, updated_at = now()
     where id = $1`,
    [jobId, status, detail],
  )
}

async function enqueueJob(
  topicId: string,
  learnerId: string,
  kind: GenerationJob['kind'],
  reason: string,
): Promise<GenerationJob> {
  const existing = await sql<GenerationJob>(
    `select * from generation_jobs
     where topic_id = $1 and learner_id = $2
       and kind = $3 and status in ('pending','running')
     order by created_at desc limit 1`,
    [topicId, learnerId, kind],
  )
  if (existing[0]) return existing[0]

  const id = randomUUID()
  await sql(
    `insert into generation_jobs
       (id, topic_id, learner_id, kind, status, reason)
     values ($1,$2,$3,$4,'pending',$5)`,
    [id, topicId, learnerId, kind, reason],
  )
  const rows = await sql<GenerationJob>(
    'select * from generation_jobs where id = $1',
    [id],
  )
  return rows[0]!
}

/** Topic-tied MCQs with equal-length distractors (cold agent stand-in / offline). */
export function synthesizeMcqsForTopic(topicTitle: string, count = 6) {
  const topic = topicTitle.trim() || 'this topic'
  const difficulties = ['easy', 'medium', 'hard', 'medium', 'hard', 'easy'] as const
  const stems = [
    `Which statement best captures a core mechanism in ${topic}?`,
    `What failure mode is most diagnostic when studying ${topic}?`,
    `Which measurement would best falsify a common claim about ${topic}?`,
    `In ${topic}, which design choice most improves robustness under distribution shift?`,
    `Which ablation most cleanly isolates the contribution claimed in ${topic}?`,
    `For ${topic}, which scaling argument is most consistent with empirical practice?`,
  ]
  const items = []
  for (let i = 0; i < count; i++) {
    const correct = `Mechanism-aligned account of ${topic} with a clear falsifier`
    const distractors = [
      `Mechanism-aligned account of ${topic} with a vague falsifier`,
      `Surface-aligned account of ${topic} with a clear falsifier`,
      `Mechanism-aligned account of ${topic} without a falsifier`,
    ]
    // Pad/truncate to equal word counts for parity
    const choices = [correct, ...distractors].map((c) => {
      const words = c.trim().split(/\s+/)
      while (words.length < 10) words.push('detail')
      return words.slice(0, 10).join(' ')
    })
    items.push({
      difficulty: difficulties[i % difficulties.length],
      question: stems[i % stems.length],
      choices,
      answerIndex: 0,
      explanation: `Correct option states a mechanism plus falsifier for ${topic}.`,
    })
  }
  return items
}

/**
 * Ensure a persisted generated set exists for this topic.
 * Seeds are NOT written here — UI may cold-bootstrap from seeds only while pending.
 */
export async function ensureMcqCurriculum(input: {
  topicId: string
  learnerId: string
  reason: string
  topUp?: boolean
}): Promise<{
  generatedCount: number
  job: GenerationJob | null
  status: 'ready' | 'generating' | 'bootstrapped'
}> {
  const topic = await topicFor(input.topicId, input.learnerId)
  const existing = await listGeneratedMcqs(input.topicId, input.learnerId)

  if (!input.topUp && existing.length >= MIN_BOOTSTRAP) {
    return { generatedCount: existing.length, job: null, status: 'ready' }
  }
  if (input.topUp && existing.length >= TOPUP_THRESHOLD) {
    // Still enqueue top-up when caller asks (progression), unless already pending
  }

  const kind = existing.length === 0 ? 'mcq_bootstrap' : 'mcq_topup'
  if (!input.topUp && existing.length > 0 && existing.length < MIN_BOOTSTRAP) {
    // continue bootstrap
  } else if (input.topUp && existing.length === 0) {
    // treat as bootstrap
  }

  const job = await enqueueJob(
    input.topicId,
    input.learnerId,
    kind,
    input.reason,
  )

  // Fulfill immediately via local synthesizer so Knowledge isn't stuck on MCP attach.
  // External MCP agents can still save richer sets later (append).
  try {
    await sql(
      `update generation_jobs set status = 'running', updated_at = now() where id = $1`,
      [job.id],
    )
    const need =
      kind === 'mcq_bootstrap'
        ? Math.max(0, MIN_BOOTSTRAP - existing.length)
        : 4
    if (need > 0) {
      await saveMcqs(
        input.topicId,
        input.learnerId,
        synthesizeMcqsForTopic(topic.title, need),
      )
    }
    await finishGenerationJob(job.id, 'done', `synthesized ${need} mcqs`)
    const after = await listGeneratedMcqs(input.topicId, input.learnerId)
    return {
      generatedCount: after.length,
      job: { ...job, status: 'done' },
      status: 'bootstrapped',
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    await finishGenerationJob(job.id, 'failed', detail)
    return {
      generatedCount: existing.length,
      job: { ...job, status: 'failed', detail },
      status: existing.length ? 'ready' : 'generating',
    }
  }
}

export { MIN_BOOTSTRAP, TOPUP_THRESHOLD }
