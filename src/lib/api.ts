export type Topic = {
  id: string
  title: string
  notes: string
  created_at: string
  updated_at: string
}

export type JourneyItem = {
  id: string
  learner_id: string
  topic_id: string
  kind: string
  item_key: string
  label: string
  bucket: 'struggle' | 'quick_forget' | 'confirmed'
  times_correct: number
  times_wrong: number
  last_outcome: string | null
  last_seen_at: string
  next_review_at: string | null
  confirmed_at: string | null
  notes: string
}

export type Journey = {
  learnerId: string
  topicId: string | null
  struggles: JourneyItem[]
  quickForget: JourneyItem[]
  confirmed: JourneyItem[]
  dueForReview: JourneyItem[]
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchTopics(): Promise<Topic[]> {
  const data = await json<{ topics: Topic[] }>(await fetch('/api/topics'))
  return data.topics
}

export async function createTopic(title: string): Promise<Topic> {
  const data = await json<{ topic: Topic }>(
    await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }),
  )
  return data.topic
}

export async function deleteTopic(id: string): Promise<void> {
  await json(await fetch(`/api/topics/${encodeURIComponent(id)}`, { method: 'DELETE' }))
}

export async function openTopic(
  id: string,
  acknowledge = false,
): Promise<{
  suggestedChatTitle: string
  prefillMessage: string
  hostInstructions: string
  firstConnect: boolean
}> {
  return json(
    await fetch(`/api/topics/${encodeURIComponent(id)}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledge }),
    }),
  )
}

export async function fetchJourney(topicId?: string): Promise<Journey> {
  const q = topicId ? `?topicId=${encodeURIComponent(topicId)}` : ''
  return json(await fetch(`/api/journey${q}`))
}

export async function recordOutcome(body: {
  topicId: string
  kind: 'mcq' | 'coding' | 'concept' | 'custom'
  itemKey: string
  label: string
  outcome: 'correct' | 'wrong' | 'pass' | 'fail'
}): Promise<JourneyItem> {
  const data = await json<{ item: JourneyItem }>(
    await fetch('/api/journey/outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
  return data.item
}
