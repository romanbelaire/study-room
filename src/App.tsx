import { useEffect, useState } from 'react'
import { KnowledgeMode } from './components/KnowledgeMode'
import { CodingMode } from './components/CodingMode'
import { DiscussionMode } from './components/DiscussionMode'
import { JourneyMode } from './components/JourneyMode'
import {
  createTopic,
  deleteTopic,
  fetchTopics,
  openTopic,
  type Topic,
} from './lib/api'
import { cn } from './lib/utils'

type Mode = 'knowledge' | 'coding' | 'discussion' | 'journey'

const MODES: { id: Mode; label: string }[] = [
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'coding', label: 'Coding' },
  { id: 'discussion', label: 'Discussion' },
  { id: 'journey', label: 'Journey' },
]

export default function App() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [topicId, setTopicId] = useState<string>('')
  const [mode, setMode] = useState<Mode>('knowledge')
  const [draft, setDraft] = useState('')
  const [connectHint, setConnectHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reloadTopics(preferId?: string) {
    const list = await fetchTopics()
    setTopics(list)
    const next = preferId && list.some((t) => t.id === preferId) ? preferId : list[0]?.id ?? ''
    setTopicId(next)
    return next
  }

  useEffect(() => {
    reloadTopics().catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  async function onSelectTopic(id: string) {
    setTopicId(id)
    setConnectHint(null)
    const session = await openTopic(id, false)
    setConnectHint(
      `${session.suggestedChatTitle} · prefill “${session.prefillMessage}”`,
    )
  }

  async function onAddTopic() {
    const title = draft.trim()
    if (!title) return
    const topic = await createTopic(title)
    setDraft('')
    await reloadTopics(topic.id)
    await onSelectTopic(topic.id)
  }

  async function onRemoveTopic() {
    if (!topicId || topics.length <= 1) return
    await deleteTopic(topicId)
    await reloadTopics()
    setConnectHint(null)
  }

  const active = topics.find((t) => t.id === topicId)

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="font-display text-3xl tracking-tight text-amber">Lattice</h1>
        <nav className="flex flex-wrap gap-4 text-sm">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                'pb-0.5 transition',
                mode === id
                  ? 'border-b border-teal text-foam'
                  : 'border-b border-transparent text-mist hover:text-foam',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onSelectTopic(t.id).catch((err) =>
                  setError(err instanceof Error ? err.message : String(err)),
                )
              }}
              className={cn(
                'text-sm transition',
                t.id === topicId ? 'text-teal' : 'text-mist hover:text-foam',
              )}
            >
              {t.title}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onAddTopic().catch((err) =>
                  setError(err instanceof Error ? err.message : String(err)),
                )
              }
            }}
            placeholder="New topic"
            className="h-9 min-w-[10rem] flex-1 rounded bg-panel-2 px-2 text-sm text-foam"
          />
          <button
            type="button"
            className="text-sm text-teal"
            onClick={() =>
              onAddTopic().catch((err) => setError(err instanceof Error ? err.message : String(err)))
            }
          >
            Add
          </button>
          {topics.length > 1 && (
            <button type="button" className="text-sm text-mist hover:text-coral" onClick={() => onRemoveTopic()}>
              Remove
            </button>
          )}
        </div>
        {active && connectHint && (
          <p className="font-mono text-[11px] text-mist">
            Agent first-connect: {connectHint}
          </p>
        )}
        {error && <p className="text-xs text-coral">{error}</p>}
      </div>

      <main>
        {!topicId ? (
          <p className="text-sm text-mist">Add a topic to begin.</p>
        ) : (
          <>
            {mode === 'knowledge' && <KnowledgeMode topicId={topicId} />}
            {mode === 'coding' && <CodingMode topicId={topicId} />}
            {mode === 'discussion' && <DiscussionMode topicId={topicId} topicTitle={active?.title ?? ''} />}
            {mode === 'journey' && <JourneyMode topicId={topicId} />}
          </>
        )}
      </main>
    </div>
  )
}
