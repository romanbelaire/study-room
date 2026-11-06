import { mkdirSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL?.trim() ?? ''
let pool: pg.Pool | undefined
let local: Promise<PGlite> | undefined

const PGDATA = resolve(process.cwd(), '.lattice/pgdata')

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== '') {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 })
    return (await pool.query(text, params)).rows as T[]
  }
  local ??= startLocal().catch((error: unknown) => {
    local = undefined
    throw error
  })
  return (await (await local).query<T>(text, params)).rows
}

async function startLocal(): Promise<PGlite> {
  mkdirSync(PGDATA, { recursive: true })
  const db = new PGlite(PGDATA)
  const files = (await readdir('migrations').catch(() => []))
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, 'utf8'))
  }
  return db
}

export function dbMode(): 'postgres' | 'pglite' {
  return databaseUrl !== '' ? 'postgres' : 'pglite'
}
