import { useEffect, useMemo, useState } from 'react'
import { MCQS, type Difficulty } from '../data/mcqs'
import { fetchMcqContent, recordOutcome, type ContentMcq } from '../lib/api'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const difficultyRank: Record<string, number> = { easy: 0, medium: 1, hard: 2 }

function seedsAsContent(): ContentMcq[] {
  return MCQS.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    question: q.question,
    choices: q.choices,
    answer_index: q.answerIndex,
    explanation: q.explanation,
    source: 'seed' as const,
  }))
}

function buildDeck(items: ContentMcq[]): ContentMcq[] {
  return shuffle(
    [...items].sort(
      (a, b) =>
        (difficultyRank[a.difficulty] ?? 1) - (difficultyRank[b.difficulty] ?? 1),
    ),
  )
}

export function KnowledgeMode({ topicId }: { topicId: string }) {
  const [deck, setDeck] = useState<ContentMcq[]>([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'generated' | 'seed'>('seed')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPicked(null)
    setError(null)
    fetchMcqContent(topicId)
      .then((data) => {
        if (cancelled) return
        if (data.preferGenerated && data.generated.length) {
          setSource('generated')
          setDeck(buildDeck(data.generated))
        } else {
          setSource('seed')
          setDeck(buildDeck(seedsAsContent()))
        }
        setIndex(0)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setSource('seed')
        setDeck(buildDeck(seedsAsContent()))
        setIndex(0)
        setLoading(false)
        setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [topicId])

  const empty = deck.length === 0
  const q = deck[index]

  function pick(i: number) {
    if (!q || picked !== null) return
    setPicked(i)
    const outcome = i === q.answer_index ? 'correct' : 'wrong'
    void recordOutcome({
      topicId,
      kind: 'mcq',
      itemKey: q.id,
      label: q.question.slice(0, 120),
      outcome,
    })
  }

  const correct = picked !== null && q && picked === q.answer_index
  const wrong = picked !== null && q && picked !== q.answer_index

  const progress = useMemo(() => {
    if (!deck.length) return '0 / 0'
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
        <span className="text-xs text-mist">
          {source === 'generated' ? 'agent set' : 'seed fallback'}
        </span>
        <span className="ml-auto font-mono text-xs text-mist">{progress}</span>
      </div>

      {loading && <p className="text-sm text-mist">Loading…</p>}
      {error && <p className="text-xs text-mist">Using seeds ({error})</p>}

      {!loading && empty && (
        <p className="text-sm text-mist">No questions yet — ask the MCP agent to generate a set.</p>
      )}

      {!loading && !empty && q && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-xs text-mist">
              {q.difficulty as Difficulty}
              {source === 'generated' ? ' · generated' : ' · seed'}
            </p>
            <p className="text-lg leading-snug text-foam">{q.question}</p>
          </div>

          <div className="flex flex-col gap-2">
            {q.choices.map((choice, i) => {
              const selected = picked === i
              const showRight = picked !== null && i === q.answer_index
              const showWrong = selected && wrong
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => pick(i)}
                  className={cn(
                    'px-0 py-2 text-left text-sm transition',
                    picked === null && 'text-foam hover:text-teal',
                    showRight && 'text-ok',
                    showWrong && 'text-coral',
                    picked !== null && !showRight && !showWrong && 'text-mist/50',
                  )}
                >
                  <span className="mr-2 font-mono text-xs text-mist">
                    {String.fromCharCode(65 + i)}
                  </span>
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
