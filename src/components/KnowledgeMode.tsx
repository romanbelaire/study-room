import { useMemo, useState } from 'react'
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
    }, 120)
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          id="topic"
          aria-label="Topic"
          className="h-9 rounded border-0 bg-panel-2 px-2 text-sm text-foam"
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

      {loading && <p className="text-sm text-mist">Shuffling…</p>}

      {!loading && empty && (
        <div className="space-y-3">
          <p className="text-sm text-mist">No questions in this slice.</p>
          <Button size="sm" onClick={() => selectTopic(ALL)}>
            All topics
          </Button>
        </div>
      )}

      {!loading && !empty && q && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-xs text-mist">
              {TOPIC_LABELS[q.topic]} · {q.difficulty}
            </p>
            <p className="text-lg leading-snug text-foam">{q.question}</p>
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
                    'px-0 py-2 text-left text-sm transition',
                    picked === null && 'text-foam hover:text-teal',
                    showRight && 'text-ok',
                    showWrong && 'text-coral',
                    picked !== null && !showRight && !showWrong && 'text-mist/50',
                  )}
                >
                  <span className="mr-2 font-mono text-xs text-mist">{String.fromCharCode(65 + i)}</span>
                  {choice}
                </button>
              )
            })}
          </div>

          {picked !== null && (
            <div className="space-y-3 border-t border-line/60 pt-4">
              <p className={cn('text-sm font-medium', correct ? 'text-ok' : 'text-coral')}>
                {correct ? 'Correct' : 'Not quite'}
              </p>
              <p className="text-sm leading-relaxed text-mist">{q.explanation}</p>
              <Button size="sm" variant="amber" onClick={next}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
