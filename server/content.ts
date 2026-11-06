import { randomUUID } from 'node:crypto'
import { sql } from './db.ts'
import { assertTopicAccess, type Topic } from './store.ts'

export type StoredMcq = {
  id: string
  topic_id: string
  owner_id: string
  difficulty: string
  question: string
  choices: string[]
  answer_index: number
  explanation: string
  source: 'generated' | 'seed'
  created_at?: string
}

export type StoredCoding = {
  id: string
  topic_id: string
  owner_id: string
  title: string
  difficulty: string
  prompt: string
  starter: string
  hint: string
  solution: string
  check_fn: string
  source: 'generated' | 'seed'
  created_at?: string
}

type McqRow = Omit<StoredMcq, 'choices' | 'source'> & {
  choices: unknown
  source: string
  created_at: string
}

type CodingRow = Omit<StoredCoding, 'source'> & { source: string; created_at: string }

async function topicFor(topicId: string, learnerId: string): Promise<Topic> {
  const rows = await sql<Topic>('select * from topics where id = $1', [topicId])
  if (!rows[0]) throw new Error(`Unknown topic ${topicId}`)
  assertTopicAccess(rows[0], learnerId, false)
  return rows[0]
}

/** Distractor parity: length spread must stay within 35% of the longest option. */
export function assertDistractorParity(choices: string[]): void {
  if (choices.length !== 4) throw new Error('MCQ must have exactly 4 choices')
  for (const c of choices) {
    if (!c || !String(c).trim()) throw new Error('empty choice')
  }
  const lens = choices.map((c) => c.trim().split(/\s+/).length)
  const mx = Math.max(...lens)
  const mn = Math.min(...lens)
  if (mx === 0 || (mx - mn) / mx > 0.35) {
    throw new Error(
      `distractor parity failed: word counts ${lens.join(',')} (max spread 35%). Follow skills/mcq-authoring.md`,
    )
  }
}

function parseChoices(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return JSON.parse(raw) as string[]
  throw new Error('invalid choices json')
}

export async function listGeneratedMcqs(
  topicId: string,
  learnerId: string,
): Promise<StoredMcq[]> {
  await topicFor(topicId, learnerId)
  const rows = await sql<McqRow>(
    `select * from generated_mcqs
     where topic_id = $1 and owner_id = $2
     order by created_at desc`,
    [topicId, learnerId],
  )
  return rows.map((r) => ({
    ...r,
    choices: parseChoices(r.choices),
    source: 'generated' as const,
  }))
}

export async function listGeneratedCoding(
  topicId: string,
  learnerId: string,
): Promise<StoredCoding[]> {
  await topicFor(topicId, learnerId)
  const rows = await sql<CodingRow>(
    `select * from generated_coding
     where topic_id = $1 and owner_id = $2
     order by created_at desc`,
    [topicId, learnerId],
  )
  return rows.map((r) => ({ ...r, source: 'generated' as const }))
}

export async function saveMcqs(
  topicId: string,
  learnerId: string,
  items: Array<{
    difficulty: string
    question: string
    choices: string[]
    answerIndex: number
    explanation: string
  }>,
): Promise<StoredMcq[]> {
  await topicFor(topicId, learnerId)
  if (!items.length) throw new Error('no mcqs to save')
  const saved: StoredMcq[] = []
  for (const item of items) {
    assertDistractorParity(item.choices)
    if (item.answerIndex < 0 || item.answerIndex > 3) {
      throw new Error('answerIndex must be 0..3')
    }
    if (!item.question.trim() || !item.explanation.trim()) {
      throw new Error('question and explanation required')
    }
    const id = randomUUID()
    await sql(
      `insert into generated_mcqs (
         id, topic_id, owner_id, difficulty, question, choices, answer_index, explanation, source
       ) values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,'generated')`,
      [
        id,
        topicId,
        learnerId,
        item.difficulty,
        item.question.trim(),
        JSON.stringify(item.choices),
        item.answerIndex,
        item.explanation.trim(),
      ],
    )
    saved.push({
      id,
      topic_id: topicId,
      owner_id: learnerId,
      difficulty: item.difficulty,
      question: item.question.trim(),
      choices: item.choices,
      answer_index: item.answerIndex,
      explanation: item.explanation.trim(),
      source: 'generated',
    })
  }
  return saved
}

export async function saveCodingTasks(
  topicId: string,
  learnerId: string,
  items: Array<{
    title: string
    difficulty: string
    prompt: string
    starter: string
    hint: string
    solution: string
    checkFn: string
  }>,
): Promise<StoredCoding[]> {
  await topicFor(topicId, learnerId)
  if (!items.length) throw new Error('no coding tasks to save')
  const saved: StoredCoding[] = []
  for (const item of items) {
    if (!item.title.trim() || !item.prompt.trim() || !item.checkFn.trim()) {
      throw new Error('title, prompt, and checkFn required')
    }
    if (!item.checkFn.includes('function check') || !item.solution.includes('function solve')) {
      throw new Error('solution must define solve; checkFn must define check(solve)')
    }
    const id = randomUUID()
    await sql(
      `insert into generated_coding (
         id, topic_id, owner_id, title, difficulty, prompt, starter, hint, solution, check_fn, source
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'generated')`,
      [
        id,
        topicId,
        learnerId,
        item.title.trim(),
        item.difficulty,
        item.prompt.trim(),
        item.starter,
        item.hint,
        item.solution,
        item.checkFn,
      ],
    )
    saved.push({
      id,
      topic_id: topicId,
      owner_id: learnerId,
      title: item.title.trim(),
      difficulty: item.difficulty,
      prompt: item.prompt.trim(),
      starter: item.starter,
      hint: item.hint,
      solution: item.solution,
      check_fn: item.checkFn,
      source: 'generated',
    })
  }
  return saved
}

export function generationBrief(topicTitle: string, topicId: string) {
  return {
    topicId,
    topicTitle,
    instructions: [
      'Author a fresh frontier set for this topic (not recycled seed trivia).',
      'Call save_mcqs with 5–10 MCQs. Enforce skills/mcq-authoring.md: all four options match in complexity, length, specificity, register.',
      'Optionally call save_coding_tasks with 1–3 short implement-or-fix tasks (solve + check functions).',
      'Then the Lattice UI will prefer generated items over seeds for this learner/topic.',
    ].join('\n'),
    mcqSchema: {
      difficulty: 'easy|medium|hard',
      question: 'string',
      choices: ['A', 'B', 'C', 'D'],
      answerIndex: '0-3',
      explanation: 'string',
    },
    codingSchema: {
      title: 'string',
      difficulty: 'easy|medium|hard',
      prompt: 'string',
      starter: 'function solve(...) { }',
      hint: 'string',
      solution: 'function solve(...) { ... }',
      checkFn: 'function check(solve) { ...; return "ok"; }',
    },
  }
}
