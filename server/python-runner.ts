import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const VENDOR = resolve(process.cwd(), 'vendor/ai-engineer-interview-questions/challenges')

/** Challenge payload for the browser — never includes reference solutions. */
export type PythonChallengeMeta = {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  problem: string
  starter: string
  /** Upstream-style tests.py; executed in-browser via Pyodide, not on the host. */
  tests: string
  attribution: string
}

const CATALOG: Array<{
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
}> = [
  { id: '01_attention', title: 'Attention from scratch', difficulty: 'medium' },
  { id: '03_sampling', title: 'Sampling (temp / top-k / top-p)', difficulty: 'easy' },
  { id: '04_positional_encodings', title: 'Sinusoidal PE + RoPE', difficulty: 'medium' },
  { id: '05_layernorm_and_softmax', title: 'Softmax / LayerNorm / RMSNorm', difficulty: 'easy' },
  { id: '06_kv_cache', title: 'KV cache decode', difficulty: 'medium' },
  { id: '07_mini_gpt_forward', title: 'Mini GPT forward', difficulty: 'hard' },
]

export async function listPythonChallenges(): Promise<PythonChallengeMeta[]> {
  const out: PythonChallengeMeta[] = []
  for (const c of CATALOG) {
    const dir = join(VENDOR, c.id)
    out.push({
      id: c.id,
      title: c.title,
      difficulty: c.difficulty,
      problem: await readFile(join(dir, 'PROBLEM.md'), 'utf8'),
      starter: await readFile(join(dir, 'starter.py'), 'utf8'),
      tests: await readFile(join(dir, 'tests.py'), 'utf8'),
      attribution:
        'MIT · ombharatiya/AI-Engineer-Interview-Questions · 12-coding-challenges',
    })
  }
  return out
}

export async function getPythonChallenge(id: string): Promise<PythonChallengeMeta> {
  const all = await listPythonChallenges()
  const hit = all.find((c) => c.id === id)
  if (!hit) throw new Error(`Unknown challenge ${id}`)
  return hit
}
