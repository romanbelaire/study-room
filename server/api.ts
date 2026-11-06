import type { IncomingMessage, ServerResponse } from 'node:http'
import { getIdentity, type PersonIdentity } from '../cursor/identity.ts'
import { dbMode } from './db.ts'
import {
  generationBrief,
  listGeneratedCoding,
  listGeneratedMcqs,
  saveCodingTasks,
  saveMcqs,
} from './content.ts'
import { getPythonChallenge, listPythonChallenges } from './python-runner.ts'
import {
  createTopic,
  deleteTopic,
  getJourney,
  listTopics,
  openTopicSession,
  recordOutcome,
  setBucket,
  updateTopic,
  type Bucket,
  type ItemKind,
  type Outcome,
} from './store.ts'

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'private, no-store')
  res.end(JSON.stringify(body))
}

/** Require a verified Cursor viewer. Locally uses the simulated identity.dev viewer. */
async function requireViewer(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<PersonIdentity | null> {
  const identity = await getIdentity(req)
  if (!identity.verified) {
    send(res, 401, { error: 'unauthorized', reason: identity.reason })
    return null
  }
  if (identity.kind === 'key') {
    // Journey/topic UI is person-scoped; API keys are not admitted here.
    send(res, 403, { error: 'forbidden', reason: 'person_required' })
    return null
  }
  return identity
}

export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  if (!url.pathname.startsWith('/api/')) return false

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }

  try {
    if (url.pathname === '/api/health' && req.method === 'GET') {
      send(res, 200, { ok: true, db: dbMode() })
      return true
    }

    // All DB-backed routes require a verified viewer; learner id is always identity.sub.
    const viewer = await requireViewer(req, res)
    if (!viewer) return true
    const learner = viewer.sub

    if (url.pathname === '/api/topics' && req.method === 'GET') {
      send(res, 200, { topics: await listTopics(learner) })
      return true
    }

    if (url.pathname === '/api/topics' && req.method === 'POST') {
      const body = (await readBody(req)) as { title?: string; notes?: string }
      const topic = await createTopic(body.title ?? '', body.notes ?? '', learner)
      send(res, 201, { topic })
      return true
    }

    const topicMatch = url.pathname.match(/^\/api\/topics\/([^/]+)$/)
    if (topicMatch && req.method === 'PATCH') {
      const body = (await readBody(req)) as { title?: string; notes?: string }
      const topic = await updateTopic(decodeURIComponent(topicMatch[1]), body, learner)
      send(res, 200, { topic })
      return true
    }
    if (topicMatch && req.method === 'DELETE') {
      await deleteTopic(decodeURIComponent(topicMatch[1]), learner)
      send(res, 200, { ok: true })
      return true
    }

    const openMatch = url.pathname.match(/^\/api\/topics\/([^/]+)\/open$/)
    if (openMatch && req.method === 'POST') {
      const body = (await readBody(req)) as { acknowledge?: boolean }
      const session = await openTopicSession(
        decodeURIComponent(openMatch[1]),
        Boolean(body.acknowledge),
        learner,
      )
      send(res, 200, session)
      return true
    }

    if (url.pathname === '/api/journey' && req.method === 'GET') {
      const topicId = url.searchParams.get('topicId') || undefined
      send(res, 200, await getJourney(learner, topicId))
      return true
    }

    if (url.pathname === '/api/journey/outcome' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        topicId: string
        kind: ItemKind
        itemKey: string
        label: string
        outcome: Outcome
        notes?: string
      }
      const item = await recordOutcome({
        learnerId: learner,
        topicId: body.topicId,
        kind: body.kind,
        itemKey: body.itemKey,
        label: body.label,
        outcome: body.outcome,
        notes: body.notes,
      })
      send(res, 200, { item })
      return true
    }

    if (url.pathname === '/api/journey/bucket' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        topicId: string
        kind: ItemKind
        itemKey: string
        label: string
        bucket: Bucket
        notes?: string
      }
      const item = await setBucket({
        learnerId: learner,
        topicId: body.topicId,
        kind: body.kind,
        itemKey: body.itemKey,
        label: body.label,
        bucket: body.bucket,
        notes: body.notes,
      })
      send(res, 200, { item })
      return true
    }

    if (url.pathname === '/api/content/mcqs' && req.method === 'GET') {
      const topicId = url.searchParams.get('topicId')
      if (!topicId) {
        send(res, 400, { error: 'topicId required' })
        return true
      }
      const generated = await listGeneratedMcqs(topicId, learner)
      send(res, 200, { generated, preferGenerated: generated.length > 0 })
      return true
    }

    if (url.pathname === '/api/content/coding' && req.method === 'GET') {
      const topicId = url.searchParams.get('topicId')
      if (!topicId) {
        send(res, 400, { error: 'topicId required' })
        return true
      }
      const generated = await listGeneratedCoding(topicId, learner)
      send(res, 200, { generated, preferGenerated: generated.length > 0 })
      return true
    }

    if (url.pathname === '/api/content/mcqs' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        topicId: string
        items: Array<{
          difficulty: string
          question: string
          choices: string[]
          answerIndex: number
          explanation: string
        }>
      }
      const saved = await saveMcqs(body.topicId, learner, body.items ?? [])
      send(res, 201, { saved })
      return true
    }

    if (url.pathname === '/api/content/coding' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        topicId: string
        items: Array<{
          title: string
          difficulty: string
          prompt: string
          starter: string
          hint: string
          solution: string
          checkFn: string
        }>
      }
      const saved = await saveCodingTasks(body.topicId, learner, body.items ?? [])
      send(res, 201, { saved })
      return true
    }

    if (url.pathname === '/api/content/brief' && req.method === 'GET') {
      const topicId = url.searchParams.get('topicId')
      if (!topicId) {
        send(res, 400, { error: 'topicId required' })
        return true
      }
      const topics = await listTopics(learner)
      const topic = topics.find((t) => t.id === topicId)
      if (!topic) {
        send(res, 404, { error: 'topic not found' })
        return true
      }
      send(res, 200, generationBrief(topic.title, topic.id))
      return true
    }

    // Read-only challenge payloads (problem/starter/tests). Execution is client-side Pyodide only.
    if (url.pathname === '/api/coding/python' && req.method === 'GET') {
      send(res, 200, { challenges: await listPythonChallenges() })
      return true
    }

    const pyMatch = url.pathname.match(/^\/api\/coding\/python\/([^/]+)$/)
    if (pyMatch && req.method === 'GET') {
      send(res, 200, { challenge: await getPythonChallenge(decodeURIComponent(pyMatch[1])) })
      return true
    }

    if (url.pathname === '/api/harness') {
      const { default: harnessHandlers } = await import('./harness-http.ts')
      return harnessHandlers(req, res)
    }

    send(res, 404, { error: 'not found' })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message.startsWith('forbidden:') ? 403 : 500
    send(res, status, { error: message.replace(/^forbidden:\s*/, '') })
    return true
  }
}
