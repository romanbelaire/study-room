import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

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

/** Local-dev bridge so the applet can show MCP harness status/controls. */
export function harnessApiPlugin(): Plugin {
  return {
    name: 'lattice-harness-api',
    configureServer(server) {
      server.middlewares.use('/api/harness', (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, harness: readState(), path: STATE }))
          return
        }
        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c) => chunks.push(c))
          req.on('end', () => {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
            const saved = writeState(body)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, harness: saved, path: STATE }))
          })
          return
        }
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        next()
      })
    },
  }
}
