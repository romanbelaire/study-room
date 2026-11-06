import type { Plugin } from 'vite'
import { handleApi } from './server/api.ts'
import { ensureSeedTopics } from './server/store.ts'

/** Local-dev API: harness + topics + journey (PGlite when DATABASE_URL unset). */
export function harnessApiPlugin(): Plugin {
  return {
    name: 'lattice-api',
    configureServer(server) {
      void ensureSeedTopics()
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next()
          return
        }
        const handled = await handleApi(req, res)
        if (!handled) next()
      })
    },
  }
}
