import { useEffect, useMemo, useRef, useState } from 'react'
import { MCQS, type Difficulty } from '../data/mcqs'
import {
  ensureMcqs,
  fetchMcqContent,
  recordOutcome,
  type ContentMcq,
} from '../lib/api'
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

/**
 * Proactive curriculum: ensure generated MCQs on topic load; top up through progression.
 * Seeds only as cold bootstrap when no generated set exists yet.
 */
export function KnowledgeMode({ topicId }: { topicId: string }) {
  const [deck, setDeck] = useState<ContentMcq[]>([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'generated' | 'seed'>('seed')
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const answeredSinceTopUp = useRef(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPicked(null)
    setError(null)
    setStatus('Generating curriculum…')
    answeredSinceTopUp.current = 0

    ensureMcqs(topicId, { reason: 'topic-load' })
      .then((ensured) => {
        if (cancelled) return
        if (ensured.generated.length) {
          setSource('generated')
          setDeck(buildDeck(ensured.generated))
          setStatus(
            ensured.status === 'bootstrapped'
              ? 'agent set (just generated)'
              : 'agent set',
          )
        } else {
          // Cold bootstrap only — temporary until generation lands.
          setSource('seed')
          setDeck(buildDeck(seedsAsContent()))
          setStatus('seed bootstrap · waiting for agent set')
        }
        setIndex(0)
        setLoading(false)
      })
      .catch(async (err) => {
        if (cancelled) return
        try {
          const data = await fetchMcqContent(topicId)
          if (cancelled) return
          if (data.generated.length) {
            setSource('generated')
            setDeck(buildDeck(data.generated))
            setStatus('agent set')
          } else {
            setSource('seed')
            setDeck(buildDeck(seedsAsContent()))
            setStatus('seed bootstrap')
          }
        } catch {
          setSource('seed')
          setDeck(buildDeck(seedsAsContent()))
          setStatus('seed bootstrap')
        }
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
    answeredSinceTopUp.current += 1
  }

  const correct = picked !== null && q && picked === q.answer_index
  const wrong = picked !== null && q && picked !== q.answer_index

  const progress = useMemo(() => {
    if (!deck.length) return '0 / 0'
    return `${Math.min(index + 1, deck.length)} / ${deck.length}`
  }, [deck.length, index])

  function next() {
    setPicked(null)
    const nearEnd = index + 1 >= deck.length - 1
    const everyFive = answeredSinceTopUp.current > 0 && answeredSinceTopUp.current % 5 === 0
    if (nearEnd || everyFive) {
      void ensureMcqs(topicId, { reason: 'progression-topup', topUp: true }).then((ensured) => {
        if (!ensured.generated.length) return
        setSource('generated')
        setStatus('agent set (topped up)')
        setDeck((prev) => {
          const seen = new Set(prev.map((x) => x.id))
          const extras = ensured.generated.filter((x) => !seen.has(x.id))
          return extras.length ? [...prev, ...shuffle(extras)] : prev
        })
      })
    }
    if (index + 1 >= deck.length) {
      setDeck((d) => shuffle(d))
      setIndex(0)
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-mist">{status || (source === 'generated' ? 'agent set' : 'seed')}</span>
        <span className="ml-auto font-mono text-xs text-mist">{progress}</span>
      </div>

      {loading && <p className="text-sm text-mist">Loading curriculum…</p>}
      {error && <p className="text-xs text-mist">Note: {error}</p>}

      {!loading && empty && (
        <p className="text-sm text-mist">No questions yet — generation is still running.</p>
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
