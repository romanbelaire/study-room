import { useEffect, useMemo, useState } from 'react'
import { CODING_TASKS } from '../data/coding'
import { fetchCodingContent, recordOutcome, type ContentCoding } from '../lib/api'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

function runCheck(checkFn: string, solutionOrStudent: string): { ok: boolean; message: string } {
  const wrapped = `${solutionOrStudent}\n;${checkFn}\n;return check(solve);`
  try {
    const fn = new Function(wrapped)
    return { ok: true, message: String(fn()) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  }
}

function seedsAsContent(): ContentCoding[] {
  return CODING_TASKS.map((t) => ({
    id: t.id,
    title: t.title,
    difficulty: t.difficulty,
    prompt: t.prompt,
    starter: t.starter,
    hint: t.hint,
    solution: t.solution,
    check_fn: t.check,
    source: 'seed' as const,
  }))
}

export function CodingMode({ topicId }: { topicId: string }) {
  const [tasks, setTasks] = useState<ContentCoding[]>([])
  const [taskId, setTaskId] = useState('')
  const [source, setSource] = useState<'generated' | 'seed'>('seed')
  const [loading, setLoading] = useState(true)

  const task = useMemo(() => {
    const t = tasks.find((x) => x.id === taskId)
    return t
  }, [tasks, taskId])

  const [code, setCode] = useState('')
  const [hintOpen, setHintOpen] = useState(false)
  const [solutionOpen, setSolutionOpen] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCodingContent(topicId)
      .then((data) => {
        if (cancelled) return
        const list =
          data.preferGenerated && data.generated.length ? data.generated : seedsAsContent()
        setSource(data.preferGenerated && data.generated.length ? 'generated' : 'seed')
        setTasks(list)
        setTaskId(list[0]?.id ?? '')
        setCode(list[0]?.starter ?? '')
        setHintOpen(false)
        setSolutionOpen(false)
        setResult(null)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        const list = seedsAsContent()
        setSource('seed')
        setTasks(list)
        setTaskId(list[0]?.id ?? '')
        setCode(list[0]?.starter ?? '')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [topicId])

  function selectTask(id: string) {
    setTaskId(id)
    const next = tasks.find((x) => x.id === id)
    if (!next) throw new Error(`Missing task ${id}`)
    setCode(next.starter)
    setHintOpen(false)
    setSolutionOpen(false)
    setResult(null)
  }

  function check() {
    if (!task) return
    const out = runCheck(task.check_fn, code)
    setResult(out)
    void recordOutcome({
      topicId,
      kind: 'coding',
      itemKey: task.id,
      label: task.title,
      outcome: out.ok ? 'pass' : 'fail',
    })
  }

  if (loading) return <p className="text-sm text-mist">Loading…</p>
  if (!task) {
    return (
      <p className="text-sm text-mist">No coding tasks — ask the MCP agent to generate a set.</p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <select
          id="task"
          aria-label="Task"
          className="h-9 max-w-full rounded border-0 bg-panel-2 px-2 text-sm text-foam"
          value={taskId}
          onChange={(e) => selectTask(e.target.value)}
        >
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} · {t.difficulty}
            </option>
          ))}
        </select>
        <span className="text-xs text-mist">
          {source === 'generated' ? 'agent set' : 'seed fallback'}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-mist">{task.prompt}</p>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="min-h-[200px] resize-y rounded bg-ink/80 p-3 font-mono text-[13px] leading-relaxed text-foam focus:outline-none focus:ring-1 focus:ring-teal/40"
        aria-label="Code editor"
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={check}>
          Run checks
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setHintOpen((v) => !v)}>
          {hintOpen ? 'Hide hint' : 'Hint'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setSolutionOpen((v) => !v)}>
          {solutionOpen ? 'Hide solution' : 'Solution'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCode(task.starter)
            setResult(null)
          }}
        >
          Reset
        </Button>
      </div>

      {hintOpen && <p className="text-sm text-amber">{task.hint}</p>}

      {solutionOpen && (
        <pre className="overflow-auto bg-ink/60 p-3 font-mono text-xs text-mist">{task.solution}</pre>
      )}

      {result && (
        <p className={cn('text-sm', result.ok ? 'text-ok' : 'text-coral')}>
          {result.ok ? 'Passed: ' : 'Failed: '}
          {result.message}
        </p>
      )}
    </div>
  )
}
