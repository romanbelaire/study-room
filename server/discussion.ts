import { randomUUID } from 'node:crypto'
import { sql } from './db.ts'
import { assertTopicAccess, type Topic } from './store.ts'

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool'

export type DiscussionMessage = {
  id: string
  topic_id: string
  learner_id: string
  role: ChatRole
  content: string
  tool_name: string | null
  tool_payload: string | null
  created_at: string
}

async function topicFor(topicId: string, learnerId: string): Promise<Topic> {
  const rows = await sql<Topic>('select * from topics where id = $1', [topicId])
  if (!rows[0]) throw new Error(`Unknown topic ${topicId}`)
  assertTopicAccess(rows[0], learnerId, false)
  return rows[0]
}

export async function listDiscussionMessages(
  topicId: string,
  learnerId: string,
  limit = 100,
): Promise<DiscussionMessage[]> {
  await topicFor(topicId, learnerId)
  return sql<DiscussionMessage>(
    `select * from discussion_messages
     where topic_id = $1 and learner_id = $2
     order by created_at asc
     limit $3`,
    [topicId, learnerId, limit],
  )
}

export async function appendDiscussionMessage(input: {
  topicId: string
  learnerId: string
  role: ChatRole
  content: string
  toolName?: string | null
  toolPayload?: unknown
}): Promise<DiscussionMessage> {
  await topicFor(input.topicId, input.learnerId)
  const id = randomUUID()
  const payload =
    input.toolPayload === undefined || input.toolPayload === null
      ? null
      : JSON.stringify(input.toolPayload)
  await sql(
    `insert into discussion_messages
       (id, topic_id, learner_id, role, content, tool_name, tool_payload)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      input.topicId,
      input.learnerId,
      input.role,
      input.content,
      input.toolName ?? null,
      payload,
    ],
  )
  const rows = await sql<DiscussionMessage>(
    'select * from discussion_messages where id = $1',
    [id],
  )
  return rows[0]!
}

/** Pending user turns with no later assistant reply (for MCP host drain). */
export async function listPendingUserMessages(
  learnerId?: string,
): Promise<DiscussionMessage[]> {
  const params: unknown[] = []
  let filter = ''
  if (learnerId) {
    params.push(learnerId)
    filter = `and m.learner_id = $1`
  }
  return sql<DiscussionMessage>(
    `select m.* from discussion_messages m
     where m.role = 'user' ${filter}
       and not exists (
         select 1 from discussion_messages a
         where a.topic_id = m.topic_id
           and a.learner_id = m.learner_id
           and a.role = 'assistant'
           and a.created_at > m.created_at
       )
     order by m.created_at asc
     limit 50`,
    params,
  )
}
