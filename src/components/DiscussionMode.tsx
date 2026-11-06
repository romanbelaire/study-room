import { useEffect, useState } from 'react'
import {
  PROMPT_CATALOG,
  RESOURCE_CATALOG,
  TOOL_CATALOG,
  TOPICS,
  cursorMcpSnippet,
  defaultHarness,
  type Depth,
  type HarnessState,
  type Lab,
  type Stage,
  type Style,
} from '../data/harness'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export function DiscussionMode() {
  const [harness, setHarness] = useState<HarnessState>(defaultHarness)
  const [status, setStatus] = useState<'loading' | 'live' | 'offline'>('loading')
  const [path, setPath] = useState<string>('.lattice/harness-state.json')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    try {
      const res = await fetch('/api/harness')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { harness: HarnessState & { source?: string }; path: string }
      const { source: _s, ...rest } = data.harness as HarnessState & { source?: string }
      setHarness(rest)
      setPath(data.path)
      setStatus('live')
    } catch (err) {
      setStatus('offline')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 4000)
    return () => window.clearInterval(id)
  }, [])

  async function save() {
    setError(null)
    try {
      const res = await fetch('/api/harness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...harness, lastTool: 'applet-ui' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { harness: HarnessState; path: string }
      setHarness(data.harness)
      setPath(data.path)
      setStatus('live')
    } catch (err) {
      setStatus('offline')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(cursorMcpSnippet('<repo-root>'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const snippet = cursorMcpSnippet('<repo-root>')

  return (
    <div className="flex flex-col gap-10">
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-amber">Harness</h2>
          <span
            className={cn(
              'font-mono text-xs',
              status === 'live' ? 'text-ok' : status === 'offline' ? 'text-coral' : 'text-mist',
            )}
          >
            {status === 'live' ? 'live' : status === 'loading' ? '…' : 'offline'}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-xs text-mist">
            Topic
            <select
              className="h-9 w-full rounded border-0 bg-panel-2 px-2 text-sm text-foam"
              value={harness.topicId}
              onChange={(e) => {
                const t = TOPICS.find((x) => x.id === e.target.value)
                if (!t) throw new Error('unknown topic')
                setHarness((h) => ({ ...h, topicId: t.id, stage: t.stage, lab: t.lab }))
              }}
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs text-mist">
            Depth
            <select
              className="h-9 w-full rounded border-0 bg-panel-2 px-2 text-sm text-foam"
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
              className="h-9 w-full rounded border-0 bg-panel-2 px-2 text-sm text-foam"
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
              className="h-9 w-full rounded border-0 bg-panel-2 px-2 text-sm text-foam"
              value={harness.stage}
              onChange={(e) => setHarness((h) => ({ ...h, stage: e.target.value as Stage }))}
            >
              <option value="screening">Screening</option>
              <option value="mid">Mid</option>
              <option value="onsite">Onsite</option>
              <option value="culture">Culture</option>
            </select>
          </label>
          <label className="block space-y-1 text-xs text-mist sm:col-span-2">
            Lab
            <select
              className="h-9 w-full rounded border-0 bg-panel-2 px-2 text-sm text-foam"
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
          Focus
          <textarea
            value={harness.focusNotes}
            onChange={(e) => setHarness((h) => ({ ...h, focusNotes: e.target.value }))}
            placeholder="Optional notes for the host agent"
            className="min-h-[64px] w-full rounded border-0 bg-panel-2 p-2 text-sm text-foam"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="amber" onClick={save}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh}>
            Refresh
          </Button>
        </div>

        <p className="font-mono text-[11px] text-mist">
          round {harness.round}
          {harness.lastTool ? ` · ${harness.lastTool}` : ''}
          {' · '}
          {path}
        </p>
        {error && <p className="text-xs text-coral">{error}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-amber">Connect</h2>
        <p className="text-sm text-mist">
          Run <code className="text-teal">npm run mcp</code>, add the server in Cursor, discuss in the
          agent chat.
        </p>
        <pre className="overflow-auto bg-ink/70 p-3 font-mono text-[11px] text-mist">{snippet}</pre>
        <Button size="sm" variant="ghost" onClick={copySnippet}>
          {copied ? 'Copied' : 'Copy config'}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-amber">Surface</h2>
        <div className="grid gap-4 text-sm text-mist sm:grid-cols-3">
          <ul className="space-y-1">
            {TOOL_CATALOG.map((t) => (
              <li key={t.name}>
                <code className="text-teal">{t.name}</code>
              </li>
            ))}
          </ul>
          <ul className="space-y-1">
            {PROMPT_CATALOG.map((p) => (
              <li key={p}>
                <code className="text-amber">{p}</code>
              </li>
            ))}
          </ul>
          <ul className="space-y-1">
            {RESOURCE_CATALOG.map((r) => (
              <li key={r.uri}>
                <code className="text-teal">{r.uri}</code>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
