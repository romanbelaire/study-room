import { useEffect, useMemo, useState } from 'react'
import { fetchPythonChallenges, recordOutcome, type PythonChallenge } from '../lib/api'
import { runChallengeInBrowser, warmPyodide } from '../lib/pyodide-runner'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

/**
 * Strict untimed Python coding desk.
 * Runs vendored numpy tests in-browser via Pyodide — no host execution, no AI helpers.
 */
export function CodingMode({ topicId }: { topicId: string }) {
  const [challenges, setChallenges] = useState<PythonChallenge[]>([])
  const [challengeId, setChallengeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [running, setRunning] = useState(false)
  const [runtimeReady, setRuntimeReady] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const challenge = useMemo(
    () => challenges.find((c) => c.id === challengeId),
    [challenges, challengeId],
  )

  useEffect(() => {
    warmPyodide()
    let cancelled = false
    import('../lib/pyodide-runner')
      .then(({ getPyodide }) => getPyodide())
      .then(() => {
        if (!cancelled) setRuntimeReady(true)
      })
      .catch(() => {
        /* first Run tests will surface the error */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPythonChallenges()
      .then((list) => {
        if (cancelled) return
        setChallenges(list)
        setChallengeId(list[0]?.id ?? '')
        setCode(list[0]?.starter ?? '')
        setResult(null)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function selectChallenge(id: string) {
    setChallengeId(id)
    const next = challenges.find((c) => c.id === id)
    if (!next) throw new Error(`Missing challenge ${id}`)
    setCode(next.starter)
    setResult(null)
  }

  async function runTests() {
    if (!challenge || running) return
    setRunning(true)
    setResult(null)
    try {
      const out = await runChallengeInBrowser(code, challenge.tests)
      setResult({ ok: out.ok, message: out.message })
      setRuntimeReady(true)
      void recordOutcome({
        topicId,
        kind: 'coding',
        itemKey: challenge.id,
        label: challenge.title,
        outcome: out.ok ? 'pass' : 'fail',
      })
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <p className="text-sm text-mist">Loading…</p>
  if (error) return <p className="text-sm text-coral">Could not load challenges: {error}</p>
  if (!challenge) {
    return <p className="text-sm text-mist">No Python challenges available.</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <select
          id="challenge"
          aria-label="Challenge"
          className="h-9 max-w-full rounded border-0 bg-panel-2 px-2 text-sm text-foam"
          value={challengeId}
          onChange={(e) => selectChallenge(e.target.value)}
        >
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} · {c.difficulty}
            </option>
          ))}
        </select>
        <span className="text-xs text-mist">
          untimed · strict · Pyodide{runtimeReady ? '' : ' · loading…'}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-mist/80">{challenge.attribution}</p>

      <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-mist">
        {challenge.problem}
      </pre>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="min-h-[280px] resize-y rounded bg-ink/80 p-3 font-mono text-[13px] leading-relaxed text-foam focus:outline-none focus:ring-1 focus:ring-teal/40"
        aria-label="Python editor"
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void runTests()} disabled={running}>
          {running ? 'Running…' : 'Run tests'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCode(challenge.starter)
            setResult(null)
          }}
          disabled={running}
        >
          Reset
        </Button>
      </div>

      {result && (
        <pre
          className={cn(
            'overflow-auto whitespace-pre-wrap bg-ink/60 p-3 font-mono text-xs',
            result.ok ? 'text-ok' : 'text-coral',
          )}
        >
          {result.ok ? 'Passed: ' : 'Failed: '}
          {result.message}
        </pre>
      )}
    </div>
  )
}
