import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'

const STATE = resolve(process.cwd(), '.lattice/harness-state.json')

const DEFAULT = {
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

function readState() {
  if (!existsSync(STATE)) return { ...DEFAULT, source: 'default' as const }
  return { ...(JSON.parse(readFileSync(STATE, 'utf8')) as object), source: 'file' as const }
}

function writeState(body: unknown) {
  mkdirSync(resolve(process.cwd(), '.lattice'), { recursive: true })
  const next = { ...(body as object), updatedAt: new Date().toISOString() }
  writeFileSync(STATE, JSON.stringify(next, null, 2) + '\n')
  return next
}

export default async function harnessHandlers(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, harness: readState(), path: STATE }))
    return true
  }
  if (req.method === 'POST') {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    const saved = writeState(body)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, harness: saved, path: STATE }))
    return true
  }
  res.statusCode = 405
  res.end()
  return true
}
