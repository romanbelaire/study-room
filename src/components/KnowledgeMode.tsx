import { useMemo, useState } from 'react'
import { CheckCircle2, CircleX, Loader2 } from 'lucide-react'
import { MCQS, TOPIC_LABELS, type Difficulty, type Mcq, type McqTopic } from '../data/mcqs'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

const ALL = 'all'

type TopicFilter = McqTopic | typeof ALL

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const difficultyRank: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }

function buildDeck(topic: TopicFilter): Mcq[] {
  const filtered = MCQS.filter((q) => topic === ALL || q.topic === topic).sort(
    (a, b) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty],
  )
  return shuffle(filtered)
}

export function KnowledgeMode() {
  const [topic, setTopic] = useState<TopicFilter>(ALL)
  // Synchronous seed — first paint must show questions (publish preview was 0/0 blank).
  const [deck, setDeck] = useState<Mcq[]>(() => buildDeck(ALL))
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const empty = deck.length === 0
  const q = deck[index]

  function selectTopic(next: TopicFilter) {
    setTopic(next)
    setPicked(null)
    setLoading(true)
    window.setTimeout(() => {
      setDeck(buildDeck(next))
      setIndex(0)
      setLoading(false)
    }, 160)
  }

  const correct = picked !== null && q && picked === q.answerIndex
  const wrong = picked !== null && q && picked !== q.answerIndex

  const progress = useMemo(() => {
    if (!deck.length) return `0 / ${MCQS.length}`
    return `${Math.min(index + 1, deck.length)} / ${deck.length}`
  }, [deck.length, index])

  function next() {
    setPicked(null)
    if (index + 1 >= deck.length) {
      setDeck(shuffle(deck))
      setIndex(0)
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-mist" htmlFor="topic">
          Topic
        </label>
        <select
          id="topic"
          className="h-8 rounded-md border border-line bg-panel-2 px-2 text-sm text-foam"
          value={topic}
          onChange={(e) => selectTopic(e.target.value as TopicFilter)}
        >
          <option value={ALL}>All topics ({MCQS.length})</option>
          {Object.entries(TOPIC_LABELS).map(([k, label]) => {
            const n = MCQS.filter((q) => q.topic === k).length
            return (
              <option key={k} value={k}>
                {label} ({n})
              </option>
            )
          })}
        </select>
        <span className="ml-auto font-mono text-xs text-mist">{progress}</span>
      </div>

      {loading && (
        <div className="animate-rise flex flex-1 flex-col gap-3 rounded-lg border border-line bg-panel-2/60 p-4">
          <div className="flex items-center gap-2 text-sm text-mist">
            <Loader2 className="h-4 w-4 animate-spin text-teal" />
            Shuffling knowledge checks…
          </div>
          <div className="skeleton h-5 w-2/3 rounded" />
          <div className="skeleton h-12 w-full rounded" />
          <div className="skeleton h-10 w-full rounded" />
          <div className="skeleton h-10 w-5/6 rounded" />
        </div>
      )}

      {!loading && empty && (
        <div className="animate-rise flex flex-1 flex-col items-start justify-center gap-2 rounded-lg border border-dashed border-line bg-panel-2/40 p-6">
          <p className="font-display text-xl text-amber">No questions in this slice</p>
          <p className="max-w-md text-sm text-mist">
            That topic filter is empty in the seed deck ({MCQS.length} total). Switch to All topics.
          </p>
          <Button size="sm" onClick={() => selectTopic(ALL)}>
            Show all topics
          </Button>
        </div>
      )}

      {!loading && !empty && q && (
        <div className="animate-rise flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          <div className="rounded-lg border border-line bg-panel-2/70 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-mist">
              <span className="rounded bg-ink/50 px-1.5 py-0.5 text-teal">{TOPIC_LABELS[q.topic]}</span>
              <span className="rounded bg-ink/50 px-1.5 py-0.5 text-amber">{q.difficulty}</span>
            </div>
            <p className="text-base leading-relaxed text-foam">{q.question}</p>
          </div>

          <div className="flex flex-col gap-2">
            {q.choices.map((choice, i) => {
              const selected = picked === i
              const showRight = picked !== null && i === q.answerIndex
              const showWrong = selected && wrong
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => setPicked(i)}
                  className={cn(
                    'rounded-md border px-3 py-2.5 text-left text-sm transition',
                    picked === null && 'border-line bg-panel hover:border-teal/60',
                    showRight && 'border-ok/70 bg-ok/10',
                    showWrong && 'border-coral/70 bg-coral/10',
                    selected && correct && 'border-ok bg-ok/15',
                    picked !== null && !showRight && !showWrong && 'opacity-60',
                  )}
                >
                  <span className="mr-2 font-mono text-xs text-mist">{String.fromCharCode(65 + i)}.</span>
                  {choice}
                </button>
              )
            })}
          </div>

          {picked !== null && (
            <div
              className={cn(
                'animate-rise-delay rounded-lg border p-3 text-sm',
                correct ? 'border-ok/50 bg-ok/10' : 'border-coral/50 bg-coral/10',
              )}
            >
              <div className="mb-1 flex items-center gap-1.5 font-medium">
                {correct ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-ok" /> Correct
                  </>
                ) : (
                  <>
                    <CircleX className="h-4 w-4 text-coral" /> Not quite
                  </>
                )}
              </div>
              <p className="text-foam/90 leading-relaxed">{q.explanation}</p>
              <div className="mt-3">
                <Button size="sm" variant="amber" onClick={next}>
                  Next question
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
