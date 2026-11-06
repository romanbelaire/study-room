import { useEffect, useState } from 'react'
import { fetchJourney, type Journey, type JourneyItem } from '../lib/api'

function BucketList({ title, items }: { title: string; items: JourneyItem[] }) {
  return (
    <section className="space-y-2">
      <h3 className="font-display text-lg text-amber">
        {title}{' '}
        <span className="font-sans text-sm text-mist">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-mist">None yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.id} className="text-foam">
              <span className="text-mist">{i.kind}</span> · {i.label}
              <span className="ml-2 font-mono text-[11px] text-mist">
                ✓{i.times_correct} ✗{i.times_wrong}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function JourneyMode({ topicId }: { topicId: string }) {
  const [journey, setJourney] = useState<Journey | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchJourney(topicId)
      .then((j) => {
        if (!cancelled) setJourney(j)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [topicId])

  if (error) return <p className="text-sm text-coral">{error}</p>
  if (!journey) return <p className="text-sm text-mist">Loading journey…</p>

  return (
    <div className="flex flex-col gap-8">
      <BucketList title="Struggles" items={journey.struggles} />
      <BucketList title="Quick-forget" items={journey.quickForget} />
      <BucketList title="Confirmed" items={journey.confirmed} />
    </div>
  )
}
