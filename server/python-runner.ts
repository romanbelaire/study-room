import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const VENDOR = resolve(process.cwd(), 'vendor/ai-engineer-interview-questions/challenges')
const TIMEOUT_MS = 20_000

export type PythonChallengeMeta = {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  problem: string
  starter: string
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

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        LANG: process.env.LANG,
        PYTHONPATH: cwd,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on('data', (d) => {
      stdout += String(d)
      if (stdout.length > 200_000) child.kill('SIGKILL')
    })
    child.stderr.on('data', (d) => {
      stderr += String(d)
      if (stderr.length > 200_000) child.kill('SIGKILL')
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolvePromise({ code: code ?? 1, stdout, stderr })
    })
  })
}

/** Real CPython execution in an isolated temp dir (not browser new Function). */
export async function runPythonChallenge(
  challengeId: string,
  studentCode: string,
): Promise<{ ok: boolean; message: string; stdout: string; stderr: string }> {
  await getPythonChallenge(challengeId)
  const dir = await mkdtemp(join(tmpdir(), 'lattice-py-'))
  try {
    const tests = await readFile(join(VENDOR, challengeId, 'tests.py'), 'utf8')
    await writeFile(join(dir, 'solution.py'), studentCode, 'utf8')
    await writeFile(join(dir, 'tests.py'), tests, 'utf8')
    const result = await runProcess('python3', ['tests.py'], dir, TIMEOUT_MS)
    const ok = result.code === 0 && /All tests passed/i.test(result.stdout)
    const message = ok
      ? 'All tests passed.'
      : (result.stderr.trim() || result.stdout.trim() || `exit ${result.code}`).slice(0, 4000)
    return { ok, message, stdout: result.stdout.slice(0, 8000), stderr: result.stderr.slice(0, 8000) }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
