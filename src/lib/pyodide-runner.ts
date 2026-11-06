/**
 * Browser-only Python runner (Pyodide / Wasm).
 * Student code never leaves the client for execution — no host CPython.
 */

const PYODIDE_INDEX = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
const RUN_TIMEOUT_MS = 25_000

type PyodideInterface = {
  loadPackage: (names: string | string[]) => Promise<unknown>
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void
    mkdirTree?: (path: string) => void
  }
  setStdout: (opts: { batched: (s: string) => void }) => void
  setStderr: (opts: { batched: (s: string) => void }) => void
  runPythonAsync: (code: string) => Promise<unknown>
}

type LoadPyodide = (opts: { indexURL: string }) => Promise<PyodideInterface>

declare global {
  interface Window {
    loadPyodide?: LoadPyodide
  }
}

let pyodidePromise: Promise<PyodideInterface> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (window.loadPyodide) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Pyodide')))
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Pyodide'))
    document.head.appendChild(script)
  })
}

export async function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadScript(`${PYODIDE_INDEX}pyodide.js`)
      if (!window.loadPyodide) throw new Error('loadPyodide missing after script load')
      const py = await window.loadPyodide({ indexURL: PYODIDE_INDEX })
      await py.loadPackage('numpy')
      return py
    })().catch((err) => {
      pyodidePromise = null
      throw err
    })
  }
  return pyodidePromise
}

export type PyRunResult = {
  ok: boolean
  message: string
  stdout: string
  stderr: string
}

/** Run student code + vendored tests.py inside Pyodide (browser Wasm). */
export async function runChallengeInBrowser(
  studentCode: string,
  tests: string,
): Promise<PyRunResult> {
  const py = await getPyodide()
  const stdout: string[] = []
  const stderr: string[] = []
  py.setStdout({ batched: (s) => stdout.push(s) })
  py.setStderr({ batched: (s) => stderr.push(s) })

  py.FS.writeFile('solution.py', studentCode)
  py.FS.writeFile('tests.py', tests)

  const runner = `
import sys, runpy, traceback
for name in list(sys.modules):
    if name == "solution" or name == "tests" or name.startswith("solution."):
        del sys.modules[name]
try:
    runpy.run_path("tests.py", run_name="__main__")
except Exception:
    traceback.print_exc()
    raise
`

  try {
    await Promise.race([
      py.runPythonAsync(runner),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout after ${RUN_TIMEOUT_MS}ms`)), RUN_TIMEOUT_MS),
      ),
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const errText = (stderr.join('') || msg).slice(0, 4000)
    return {
      ok: false,
      message: errText,
      stdout: stdout.join('').slice(0, 8000),
      stderr: errText.slice(0, 8000),
    }
  }

  const out = stdout.join('')
  const err = stderr.join('')
  const ok = /All tests passed/i.test(out)
  return {
    ok,
    message: ok
      ? 'All tests passed.'
      : (err.trim() || out.trim() || 'Tests did not report success.').slice(0, 4000),
    stdout: out.slice(0, 8000),
    stderr: err.slice(0, 8000),
  }
}

export function warmPyodide(): void {
  void getPyodide()
}
