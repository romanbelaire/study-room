import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { handleApi } from './api.ts'
import { ensureSeedTopics } from './store.ts'

const dist = resolve(process.cwd(), 'dist')
const port = Number(process.env.PORT || 4627)

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
}

await ensureSeedTopics()

createServer(async (req, res) => {
  if (await handleApi(req, res)) return
  const path = (req.url ?? '/').split('?')[0]
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path)
  const safe = file.startsWith(dist) ? file : join(dist, 'index.html')
  if (existsSync(safe) && !safe.endsWith('/')) {
    const ext = extname(safe)
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
    res.end(readFileSync(safe))
    return
  }
  res.setHeader('Content-Type', 'text/html')
  res.end(readFileSync(join(dist, 'index.html')))
}).listen(port, '0.0.0.0', () => {
  console.error(`lattice listening on ${port}`)
})
