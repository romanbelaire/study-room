import { useEffect, useRef, useState } from 'react'
import {
  TOPICS,
  defaultHarness,
  type Depth,
  type HarnessState,
  type Lab,
  type Stage,
  type Style,
} from '../data/harness'
import {
  fetchDiscussionMessages,
  sendDiscussionMessage,
  type DiscussionMessage,
} from '../lib/api'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export function DiscussionMode({
  topicId,
  topicTitle,
}: {
  topicId: string
  topicTitle: string
}) {
  const [harness, setHarness] = useState<HarnessState>(defaultHarness)
  const [harnessStatus, setHarnessStatus] = useState<'loading' | 'live' | 'offline'>('loading')
  const [messages, setMessages] = useState<DiscussionMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  async function refreshHarness() {
    try {
      const res = await fetch('/api/harness')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { harness: HarnessState & { source?: string } }
      const { source: _s, ...rest } = data.harness
      setHarness({
        ...rest,
        // Keep applet topic in sync as session context
        topicId: rest.topicId || topicId,
      })
      setHarnessStatus('live')
    } catch {
      setHarnessStatus('offline')
    }
  }

  async function loadThread() {
    setError(null)
    try {
      const list = await fetchDiscussionMessages(topicId, topicTitle)
      setMessages(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    void refreshHarness()
    void loadThread()
  }, [topicId, topicTitle])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function saveHarness() {
    setError(null)
    try {
      const res = await fetch('/api/harness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...harness, lastTool: 'applet-ui' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { harness: HarnessState }
      setHarness(data.harness)
      setHarnessStatus('live')
    } catch (err) {
      setHarnessStatus('offline')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    setDraft('')
    try {
      // Persist harness first so the turn sees current depth/style/stage/lab/notes.
      await saveHarness()
      const result = await sendDiscussionMessage(topicId, topicTitle, text)
      setMessages(result.messages)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  const visible = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
  const recentTools = messages.filter((m) => m.role === 'tool').slice(-6)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-mist">
          Chat · <span className="text-foam">{topicTitle || topicId}</span>
        </p>
        <button
          type="button"
          className="text-xs text-teal"
          onClick={() => setConfigOpen((v) => !v)}
        >
          {configOpen ? 'Hide session' : 'Session config'}
        </button>
        <span
          className={cn(
            'ml-auto font-mono text-xs',
            harnessStatus === 'live' ? 'text-ok' : harnessStatus === 'offline' ? 'text-coral' : 'text-mist',
          )}
        >
          {harnessStatus === 'live' ? 'harness live' : harnessStatus === 'loading' ? '…' : 'harness offline'}
        </span>
      </div>

      {configOpen && (
        <section className="space-y-3 rounded bg-panel-2/40 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs text-mist">
              Depth
              <select
                className="h-9 w-full rounded border-0 bg-ink px-2 text-sm text-foam"
                value={harness.depth}
                onChange={(e) => setHarness((h) => ({ ...h, depth: e.target.value as Depth }))}
              >
                <option value="screen">Screen</option>
                <option value="deep">Deep</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs text-mist">
              Style
              <select
                className="h-9 w-full rounded border-0 bg-ink px-2 text-sm text-foam"
                value={harness.style}
                onChange={(e) => setHarness((h) => ({ ...h, style: e.target.value as Style }))}
              >
                <option value="socratic">Socratic</option>
                <option value="critique">Critique</option>
                <option value="whiteboard">Whiteboard</option>
                <option value="defense">Defense</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs text-mist">
              Stage
              <select
                className="h-9 w-full rounded border-0 bg-ink px-2 text-sm text-foam"
                value={harness.stage}
                onChange={(e) => setHarness((h) => ({ ...h, stage: e.target.value as Stage }))}
              >
                <option value="screening">Screening</option>
                <option value="mid">Mid</option>
                <option value="onsite">Onsite</option>
                <option value="culture">Culture</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs text-mist">
              Lab
              <select
                className="h-9 w-full rounded border-0 bg-ink px-2 text-sm text-foam"
                value={harness.lab}
                onChange={(e) => setHarness((h) => ({ ...h, lab: e.target.value as Lab }))}
              >
                <option value="either">Either</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-xs text-mist">
            Focus notes
            <textarea
              value={harness.focusNotes}
              onChange={(e) => setHarness((h) => ({ ...h, focusNotes: e.target.value }))}
              className="min-h-[56px] w-full rounded border-0 bg-ink p-2 text-sm text-foam"
              placeholder="Session notes for the discussion agent"
            />
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="amber" onClick={() => void saveHarness()}>
              Save session
            </Button>
            <select
              className="h-8 rounded border-0 bg-ink px-2 text-xs text-foam"
              value={harness.topicId}
              onChange={(e) => {
                const t = TOPICS.find((x) => x.id === e.target.value)
                if (!t) return
                setHarness((h) => ({ ...h, topicId: t.id, stage: t.stage, lab: t.lab }))
              }}
              aria-label="Drill topic mapping"
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      <div className="flex max-h-[420px] min-h-[280px] flex-col gap-3 overflow-y-auto rounded bg-ink/50 p-3">
        {visible.length === 0 && (
          <p className="text-sm text-mist">Opening discussion…</p>
        )}
        {visible.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[92%] text-sm leading-relaxed',
              m.role === 'user' ? 'ml-auto text-teal' : 'mr-auto text-foam',
            )}
          >
            <p className="mb-0.5 font-mono text-[10px] uppercase tracking-wide text-mist">
              {m.role === 'user' ? 'you' : 'lattice'}
            </p>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {recentTools.length > 0 && (
        <p className="font-mono text-[10px] text-mist">
          tools:{' '}
          {recentTools.map((t) => t.tool_name ?? 'tool').join(' · ')}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder="Talk through the topic — Enter to send"
          className="min-h-[72px] w-full resize-y rounded bg-panel-2 p-3 text-sm text-foam"
          disabled={sending}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void send()} disabled={sending || !draft.trim()}>
            {sending ? 'Thinking…' : 'Send'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void loadThread()} disabled={sending}>
            Refresh
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  )
}
