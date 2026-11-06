import type { IncomingMessage, ServerResponse } from 'node:http'
import { getIdentity } from '../cursor/identity.ts'
import { dbMode } from './db.ts'
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
  res.end(JSON.stringify(body))
}

async function learnerId(req: IncomingMessage): Promise<string> {
  const id = await getIdentity(req)
  if (id.verified) return id.sub
  return 'local-learner'
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

    if (url.pathname === '/api/topics' && req.method === 'GET') {
      send(res, 200, { topics: await listTopics() })
      return true
    }

    if (url.pathname === '/api/topics' && req.method === 'POST') {
      const body = (await readBody(req)) as { title?: string; notes?: string }
      const topic = await createTopic(body.title ?? '', body.notes ?? '')
      send(res, 201, { topic })
      return true
    }

    const topicMatch = url.pathname.match(/^\/api\/topics\/([^/]+)$/)
    if (topicMatch && req.method === 'PATCH') {
      const body = (await readBody(req)) as { title?: string; notes?: string }
      const topic = await updateTopic(decodeURIComponent(topicMatch[1]), body)
      send(res, 200, { topic })
      return true
    }
    if (topicMatch && req.method === 'DELETE') {
      await deleteTopic(decodeURIComponent(topicMatch[1]))
      send(res, 200, { ok: true })
      return true
    }

    const openMatch = url.pathname.match(/^\/api\/topics\/([^/]+)\/open$/)
    if (openMatch && req.method === 'POST') {
      const body = (await readBody(req)) as { acknowledge?: boolean }
      const session = await openTopicSession(
        decodeURIComponent(openMatch[1]),
        Boolean(body.acknowledge),
      )
      send(res, 200, session)
      return true
    }

    if (url.pathname === '/api/journey' && req.method === 'GET') {
      const learner = url.searchParams.get('learnerId') || (await learnerId(req))
      const topicId = url.searchParams.get('topicId') || undefined
      send(res, 200, await getJourney(learner, topicId))
      return true
    }

    if (url.pathname === '/api/journey/outcome' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        learnerId?: string
        topicId: string
        kind: ItemKind
        itemKey: string
        label: string
        outcome: Outcome
        notes?: string
      }
      const learner = body.learnerId || (await learnerId(req))
      const item = await recordOutcome({ ...body, learnerId: learner })
      send(res, 200, { item })
      return true
    }

    if (url.pathname === '/api/journey/bucket' && req.method === 'POST') {
      const body = (await readBody(req)) as {
        learnerId?: string
        topicId: string
        kind: ItemKind
        itemKey: string
        label: string
        bucket: Bucket
        notes?: string
      }
      const learner = body.learnerId || (await learnerId(req))
      const item = await setBucket({ ...body, learnerId: learner })
      send(res, 200, { item })
      return true
    }

    // Keep harness endpoints for Discussion mode
    if (url.pathname === '/api/harness') {
      const { default: harnessHandlers } = await import('./harness-http.ts')
      return harnessHandlers(req, res)
    }

    send(res, 404, { error: 'not found' })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    send(res, 500, { error: message })
    return true
  }
}
