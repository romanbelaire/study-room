import { useMemo, useState } from 'react'
import { Eye, Lightbulb, Play, RotateCcw } from 'lucide-react'
import { CODING_TASKS, type CodingTask } from '../data/coding'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

function runCheck(task: CodingTask, code: string): { ok: boolean; message: string } {
  const wrapped = `${code}\n;${task.check}\n;return check(solve);`
  try {
    const fn = new Function(wrapped)
    const message = String(fn())
    return { ok: true, message }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, message }
  }
}

const TRACK_LABEL: Record<CodingTask['track'], string> = {
  'openai-ml-math': 'OpenAI ML-math',
  'anthropic-coderpad': 'Anthropic CoderPad',
  'systems-rl': 'Systems / RL',
}

export function CodingMode() {
  const [taskId, setTaskId] = useState(CODING_TASKS[0].id)
  const task = useMemo(() => {
    const t = CODING_TASKS.find((x) => x.id === taskId)
    if (!t) throw new Error(`Missing task ${taskId}`)
    return t
  }, [taskId])

  const [code, setCode] = useState(task.starter)
  const [hintOpen, setHintOpen] = useState(false)
  const [solutionOpen, setSolutionOpen] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function selectTask(id: string) {
    setTaskId(id)
    const next = CODING_TASKS.find((x) => x.id === id)
    if (!next) throw new Error(`Missing task ${id}`)
    setCode(next.starter)
    setHintOpen(false)
    setSolutionOpen(false)
    setResult(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-mist" htmlFor="task">
          Task
        </label>
        <select
          id="task"
          className="h-8 max-w-full rounded-md border border-line bg-panel-2 px-2 text-sm text-foam"
          value={taskId}
          onChange={(e) => selectTask(e.target.value)}
        >
          {CODING_TASKS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} · {TRACK_LABEL[t.track]} · {t.difficulty}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-line bg-panel-2/70 p-3">
        <p className="mb-1 text-[11px] uppercase tracking-wide text-teal">{TRACK_LABEL[task.track]}</p>
        <p className="text-sm leading-relaxed text-foam">{task.prompt}</p>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="min-h-[180px] flex-1 resize-y rounded-lg border border-line bg-ink/80 p-3 font-mono text-[13px] leading-relaxed text-foam focus:border-teal/50 focus:outline-none"
        aria-label="Code editor"
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setResult(runCheck(task, code))}>
          <Play className="h-3.5 w-3.5" />
          Run checks
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setHintOpen((v) => !v)}>
          <Lightbulb className="h-3.5 w-3.5" />
          {hintOpen ? 'Hide hint' : 'Hint'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setSolutionOpen((v) => !v)}>
          <Eye className="h-3.5 w-3.5" />
          {solutionOpen ? 'Hide solution' : 'Reveal solution'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCode(task.starter)
            setResult(null)
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      {hintOpen && (
        <p className="animate-rise rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber">
          {task.hint}
        </p>
      )}

      {solutionOpen && (
        <pre className="animate-rise overflow-auto rounded-md border border-line bg-ink/70 p-3 font-mono text-xs text-mist">
          {task.solution}
        </pre>
      )}

      {result && (
        <div
          className={cn(
            'animate-rise rounded-md border px-3 py-2 text-sm',
            result.ok ? 'border-ok/50 bg-ok/10 text-ok' : 'border-coral/50 bg-coral/10 text-coral',
          )}
        >
          {result.ok ? 'Passed: ' : 'Failed: '}
          {result.message}
        </div>
      )}
    </div>
  )
}
