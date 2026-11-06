import { randomUUID } from 'node:crypto'
import { sql } from './db.ts'

export type Topic = {
  id: string
  title: string
  notes: string
  owner_id: string | null
  created_at: string
  updated_at: string
}

export type Bucket = 'struggle' | 'quick_forget' | 'confirmed'
export type ItemKind = 'mcq' | 'coding' | 'concept' | 'custom'
export type Outcome = 'correct' | 'wrong' | 'pass' | 'fail'

export type JourneyItem = {
  id: string
  learner_id: string
  topic_id: string
  kind: ItemKind
  item_key: string
  label: string
  bucket: Bucket
  times_correct: number
  times_wrong: number
  last_outcome: string | null
  last_seen_at: string
  next_review_at: string | null
  confirmed_at: string | null
  notes: string
}

const SEED_TOPICS = [
  { id: 'rs-openai', title: 'OpenAI RS loop' },
  { id: 'rs-anthropic', title: 'Anthropic RS loop' },
  { id: 'transformers', title: 'Transformers' },
]

function iso(d: Date = new Date()) {
  return d.toISOString()
}

function addDays(days: number) {
  return iso(new Date(Date.now() + days * 86400000))
}

export async function ensureSeedTopics(): Promise<void> {
  for (const t of SEED_TOPICS) {
    await sql(
      `insert into topics (id, title, notes, owner_id) values ($1, $2, $3, null)
       on conflict (id) do nothing`,
      [t.id, t.title, ''],
    )
  }
}

function assertTopicAccess(topic: Topic, learnerId: string, mutate: boolean): void {
  const sharedSeed = topic.owner_id === null
  if (sharedSeed && mutate) throw new Error('forbidden: cannot modify shared seed topics')
  if (!sharedSeed && topic.owner_id !== learnerId) {
    throw new Error('forbidden: topic not owned by viewer')
  }
}

export async function listTopics(learnerId: string): Promise<Topic[]> {
  await ensureSeedTopics()
  return sql<Topic>(
    `select * from topics
     where owner_id is null or owner_id = $1
     order by created_at asc`,
    [learnerId],
  )
}

export async function createTopic(
  title: string,
  notes = '',
  ownerId: string,
): Promise<Topic> {
  const id = randomUUID()
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Topic title required')
  await sql(`insert into topics (id, title, notes, owner_id) values ($1, $2, $3, $4)`, [
    id,
    trimmed,
    notes,
    ownerId,
  ])
  const rows = await sql<Topic>('select * from topics where id = $1', [id])
  return rows[0]
}

export async function updateTopic(
  id: string,
  patch: { title?: string; notes?: string },
  learnerId: string,
): Promise<Topic> {
  const cur = await sql<Topic>('select * from topics where id = $1', [id])
  if (!cur[0]) throw new Error(`Unknown topic ${id}`)
  assertTopicAccess(cur[0], learnerId, true)
  const title = patch.title?.trim() || cur[0].title
  const notes = patch.notes ?? cur[0].notes
  await sql(
    `update topics set title = $2, notes = $3, updated_at = now()
     where id = $1 and owner_id = $4`,
    [id, title, notes, learnerId],
  )
  return (await sql<Topic>('select * from topics where id = $1', [id]))[0]
}

export async function deleteTopic(id: string, learnerId: string): Promise<void> {
  const cur = await sql<Topic>('select * from topics where id = $1', [id])
  if (!cur[0]) throw new Error(`Unknown topic ${id}`)
  assertTopicAccess(cur[0], learnerId, true)
  await sql('delete from topics where id = $1 and owner_id = $2', [id, learnerId])
}

export function firstConnectPayload(topic: Topic) {
  return {
    topicId: topic.id,
    suggestedChatTitle: `Lattice · ${topic.title}`,
    prefillMessage: 'What are you studying?',
    hostInstructions: [
      'On first connect for this topic tab:',
      `1. Set the agent/chat title to: Lattice · ${topic.title}`,
      '2. Prefill (or send as the opening user-visible prompt) exactly: What are you studying?',
      '3. Wait for the learner answer before drilling; then call set_harness / start_round or journey tools as needed.',
      '4. Call open_topic with acknowledge=true after applying title+prefill so Lattice records the session.',
    ].join('\n'),
  }
}

export async function openTopicSession(
  topicId: string,
  acknowledge = false,
  learnerId: string,
) {
  const rows = await sql<Topic>('select * from topics where id = $1', [topicId])
  if (!rows[0]) throw new Error(`Unknown topic ${topicId}`)
  assertTopicAccess(rows[0], learnerId, false)
  const payload = firstConnectPayload(rows[0])
  if (acknowledge) {
    await sql(
      `insert into topic_sessions (topic_id, chat_title, prefill, connected_at)
       values ($1, $2, $3, now())
       on conflict (topic_id) do update set
         chat_title = excluded.chat_title,
         prefill = excluded.prefill,
         connected_at = now()`,
      [topicId, payload.suggestedChatTitle, payload.prefillMessage],
    )
  }
  const session = await sql<{ connected_at: string }>(
    'select connected_at from topic_sessions where topic_id = $1',
    [topicId],
  )
  return {
    ...payload,
    firstConnect: session.length === 0 || !acknowledge,
    lastConnectedAt: session[0]?.connected_at ?? null,
  }
}

function nextBucket(
  prev: Bucket | null,
  outcome: Outcome,
): { bucket: Bucket; timesCorrectDelta: number; timesWrongDelta: number } {
  const good = outcome === 'correct' || outcome === 'pass'
  if (!good) {
    return { bucket: 'struggle', timesCorrectDelta: 0, timesWrongDelta: 1 }
  }
  if (prev === 'struggle' || prev === null) {
    return { bucket: 'quick_forget', timesCorrectDelta: 1, timesWrongDelta: 0 }
  }
  if (prev === 'quick_forget') {
    return { bucket: 'confirmed', timesCorrectDelta: 1, timesWrongDelta: 0 }
  }
  return { bucket: 'confirmed', timesCorrectDelta: 1, timesWrongDelta: 0 }
}

export async function recordOutcome(input: {
  learnerId: string
  topicId: string
  kind: ItemKind
  itemKey: string
  label: string
  outcome: Outcome
  notes?: string
}): Promise<JourneyItem> {
  const topic = await sql<Topic>('select * from topics where id = $1', [input.topicId])
  if (!topic[0]) throw new Error(`Unknown topic ${input.topicId}`)
  assertTopicAccess(topic[0], input.learnerId, false)

  const existing = await sql<JourneyItem>(
    `select * from journey_items
     where learner_id = $1 and topic_id = $2 and kind = $3 and item_key = $4`,
    [input.learnerId, input.topicId, input.kind, input.itemKey],
  )
  const prev = existing[0] ?? null
  const move = nextBucket(prev?.bucket ?? null, input.outcome)
  const timesCorrect = (prev?.times_correct ?? 0) + move.timesCorrectDelta
  const timesWrong = (prev?.times_wrong ?? 0) + move.timesWrongDelta
  const confirmedAt =
    move.bucket === 'confirmed' ? (prev?.confirmed_at ?? iso()) : null
  const nextReview =
    move.bucket === 'confirmed'
      ? addDays(7)
      : move.bucket === 'quick_forget'
        ? addDays(1)
        : addDays(0)

  const id = prev?.id ?? randomUUID()
  if (prev) {
    await sql(
      `update journey_items set
         label = $2,
         bucket = $3,
         times_correct = $4,
         times_wrong = $5,
         last_outcome = $6,
         last_seen_at = now(),
         next_review_at = $7,
         confirmed_at = $8,
         notes = $9
       where id = $1`,
      [
        id,
        input.label,
        move.bucket,
        timesCorrect,
        timesWrong,
        input.outcome,
        nextReview,
        confirmedAt,
        input.notes ?? prev.notes,
      ],
    )
  } else {
    await sql(
      `insert into journey_items (
         id, learner_id, topic_id, kind, item_key, label, bucket,
         times_correct, times_wrong, last_outcome, last_seen_at,
         next_review_at, confirmed_at, notes
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),$11,$12,$13)`,
      [
        id,
        input.learnerId,
        input.topicId,
        input.kind,
        input.itemKey,
        input.label,
        move.bucket,
        timesCorrect,
        timesWrong,
        input.outcome,
        nextReview,
        confirmedAt,
        input.notes ?? '',
      ],
    )
  }

  await sql(
    `insert into outcome_events (id, learner_id, topic_id, kind, item_key, outcome)
     values ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), input.learnerId, input.topicId, input.kind, input.itemKey, input.outcome],
  )

  return (
    await sql<JourneyItem>('select * from journey_items where id = $1', [id])
  )[0]
}

export async function setBucket(input: {
  learnerId: string
  topicId: string
  kind: ItemKind
  itemKey: string
  label: string
  bucket: Bucket
  notes?: string
}): Promise<JourneyItem> {
  const existing = await sql<JourneyItem>(
    `select * from journey_items
     where learner_id = $1 and topic_id = $2 and kind = $3 and item_key = $4`,
    [input.learnerId, input.topicId, input.kind, input.itemKey],
  )
  const id = existing[0]?.id ?? randomUUID()
  const confirmedAt = input.bucket === 'confirmed' ? iso() : null
  if (existing[0]) {
    await sql(
      `update journey_items set bucket = $2, label = $3, notes = $4,
         confirmed_at = $5, last_seen_at = now() where id = $1`,
      [id, input.bucket, input.label, input.notes ?? existing[0].notes, confirmedAt],
    )
  } else {
    await sql(
      `insert into journey_items (
         id, learner_id, topic_id, kind, item_key, label, bucket, confirmed_at, notes
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        input.learnerId,
        input.topicId,
        input.kind,
        input.itemKey,
        input.label,
        input.bucket,
        confirmedAt,
        input.notes ?? '',
      ],
    )
  }
  return (await sql<JourneyItem>('select * from journey_items where id = $1', [id]))[0]
}

export async function getJourney(learnerId: string, topicId?: string) {
  await ensureSeedTopics()
  const params: unknown[] = [learnerId]
  let where = 'learner_id = $1'
  if (topicId) {
    where += ' and topic_id = $2'
    params.push(topicId)
  }
  const items = await sql<JourneyItem>(
    `select * from journey_items where ${where} order by last_seen_at desc`,
    params,
  )
  const due = items.filter(
    (i) =>
      i.bucket !== 'struggle' &&
      i.next_review_at &&
      new Date(i.next_review_at).getTime() <= Date.now(),
  )
  return {
    learnerId,
    topicId: topicId ?? null,
    struggles: items.filter((i) => i.bucket === 'struggle'),
    quickForget: items.filter((i) => i.bucket === 'quick_forget' || due.includes(i)),
    confirmed: items.filter((i) => i.bucket === 'confirmed' && !due.includes(i)),
    dueForReview: due,
  }
}
