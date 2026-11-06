import { useMemo, useState } from 'react'
import { CODING_TASKS, type CodingTask } from '../data/coding'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

function runCheck(task: CodingTask, code: string): { ok: boolean; message: string } {
  const wrapped = `${code}\n;${task.check}\n;return check(solve);`
  try {
    const fn = new Function(wrapped)
    return { ok: true, message: String(fn()) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
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
    <div className="flex flex-col gap-5">
      <select
        id="task"
        aria-label="Task"
        className="h-9 max-w-full rounded border-0 bg-panel-2 px-2 text-sm text-foam"
        value={taskId}
        onChange={(e) => selectTask(e.target.value)}
      >
        {CODING_TASKS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title} · {TRACK_LABEL[t.track]} · {t.difficulty}
          </option>
        ))}
      </select>

      <p className="text-sm leading-relaxed text-mist">{task.prompt}</p>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="min-h-[200px] resize-y rounded bg-ink/80 p-3 font-mono text-[13px] leading-relaxed text-foam focus:outline-none focus:ring-1 focus:ring-teal/40"
        aria-label="Code editor"
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setResult(runCheck(task, code))}>
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
