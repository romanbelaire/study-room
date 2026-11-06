import { useEffect, useState } from 'react'
import { Cable, Copy, Radio, RefreshCw, Save } from 'lucide-react'
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
  const [copied, setCopied] = useState<string | null>(null)
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
      setStatus(data.harness.source === 'file' || data.harness.lastTool ? 'live' : 'live')
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
      setError(
        (err instanceof Error ? err.message : String(err)) +
          ' — harness file API needs `npm run dev` locally; MCP still works via stdio.',
      )
    }
  }

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1500)
  }

  const snippet = cursorMcpSnippet('<repo-root>')

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto">
      <div className="animate-rise rounded-lg border border-line bg-panel-2/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-display text-xl text-amber">MCP discussion harness</p>
            <p className="mt-1 max-w-2xl text-sm text-mist">
              Longer-form RS interview discussion runs in your attached LLM agent — not in this
              window. Lattice exposes tools, resources, and prompts for screening → mid → onsite
              (OpenAI empirics vs Anthropic taste/oversight). Use this panel to configure state and
              connect.
            </p>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
              status === 'live' && 'border-ok/40 bg-ok/10 text-ok',
              status === 'offline' && 'border-coral/40 bg-coral/10 text-coral',
              status === 'loading' && 'border-line text-mist',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                status === 'live' ? 'animate-pulse-dot bg-ok' : 'bg-mist',
              )}
            />
            {status === 'live' ? 'Harness file reachable' : status === 'loading' ? 'Checking…' : 'API offline'}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="animate-rise-delay space-y-2 rounded-lg border border-line bg-ink/40 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foam">
            <Radio className="h-4 w-4 text-teal" /> Session controls
          </p>
          <label className="block text-[11px] uppercase tracking-wide text-mist" htmlFor="h-topic">
            Topic
          </label>
          <select
            id="h-topic"
            className="h-8 w-full rounded-md border border-line bg-panel-2 px-2 text-sm"
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] uppercase tracking-wide text-mist" htmlFor="h-depth">
                Depth
              </label>
              <select
                id="h-depth"
                className="mt-0.5 h-8 w-full rounded-md border border-line bg-panel-2 px-2 text-sm"
                value={harness.depth}
                onChange={(e) => setHarness((h) => ({ ...h, depth: e.target.value as Depth }))}
              >
                <option value="screen">Screen</option>
                <option value="deep">Deep dive</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-mist" htmlFor="h-style">
                Style
              </label>
              <select
                id="h-style"
                className="mt-0.5 h-8 w-full rounded-md border border-line bg-panel-2 px-2 text-sm"
                value={harness.style}
                onChange={(e) => setHarness((h) => ({ ...h, style: e.target.value as Style }))}
              >
                <option value="socratic">Socratic</option>
                <option value="critique">Critique</option>
                <option value="whiteboard">Whiteboard</option>
                <option value="defense">Defense</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-mist" htmlFor="h-stage">
                Stage
              </label>
              <select
                id="h-stage"
                className="mt-0.5 h-8 w-full rounded-md border border-line bg-panel-2 px-2 text-sm"
                value={harness.stage}
                onChange={(e) => setHarness((h) => ({ ...h, stage: e.target.value as Stage }))}
              >
                <option value="screening">Screening</option>
                <option value="mid">Mid-stage</option>
                <option value="onsite">Onsite</option>
                <option value="culture">Culture</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-mist" htmlFor="h-lab">
                Lab
              </label>
              <select
                id="h-lab"
                className="mt-0.5 h-8 w-full rounded-md border border-line bg-panel-2 px-2 text-sm"
                value={harness.lab}
                onChange={(e) => setHarness((h) => ({ ...h, lab: e.target.value as Lab }))}
              >
                <option value="either">Either</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
          </div>

          <label className="block text-[11px] uppercase tracking-wide text-mist" htmlFor="h-focus">
            Focus notes
          </label>
          <textarea
            id="h-focus"
            value={harness.focusNotes}
            onChange={(e) => setHarness((h) => ({ ...h, focusNotes: e.target.value }))}
            placeholder="e.g. masked softmax numerics; CAI vs RLAIF; 48h kill criterion"
            className="min-h-[72px] w-full rounded-md border border-line bg-panel-2 p-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="amber" onClick={save}>
              <Save className="h-3.5 w-3.5" />
              Write harness file
            </Button>
            <Button size="sm" variant="secondary" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh status
            </Button>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px] text-mist">
            <dt>round</dt>
            <dd className="text-foam">{harness.round}</dd>
            <dt>lastTool</dt>
            <dd className="truncate text-foam">{harness.lastTool ?? '—'}</dd>
            <dt>lastProbe</dt>
            <dd className="truncate text-foam">{harness.lastProbe ?? '—'}</dd>
            <dt>updated</dt>
            <dd className="truncate text-foam">{harness.updatedAt}</dd>
            <dt>file</dt>
            <dd className="truncate text-teal">{path}</dd>
          </dl>
          {error && <p className="text-xs text-coral">{error}</p>}
        </section>

        <section className="space-y-2 rounded-lg border border-line bg-ink/40 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foam">
            <Cable className="h-4 w-4 text-teal" /> Connect MCP
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-sm text-mist">
            <li>
              Terminal: <code className="text-teal">npm run mcp</code> (stdio server) — or let the
              host spawn it.
            </li>
            <li>Add the server in Cursor MCP settings (snippet below).</li>
            <li>
              In the agent chat: use prompt{' '}
              <code className="text-amber">start_round</code> / mission-gate / theory-spinning-up —
              discussion stays in the agent.
            </li>
          </ol>
          <pre className="overflow-auto rounded-md border border-line bg-ink/80 p-2 font-mono text-[11px] text-mist">
            {snippet}
          </pre>
          <Button size="sm" variant="secondary" onClick={() => copy('mcp', snippet)}>
            <Copy className="h-3.5 w-3.5" />
            {copied === 'mcp' ? 'Copied' : 'Copy mcp.json snippet'}
          </Button>
          <p className="text-[11px] text-mist">
            Optional: <code className="text-teal">LATTICE_HARNESS_PATH</code> overrides the state
            file. No API keys in the applet — the host model is the interviewer.
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-line bg-panel-2/50 p-3">
        <p className="mb-2 text-sm font-medium text-foam">Surface area</p>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <div>
            <p className="mb-1 uppercase tracking-wide text-mist">Tools</p>
            <ul className="space-y-1 text-foam/90">
              {TOOL_CATALOG.map((t) => (
                <li key={t.name}>
                  <code className="text-teal">{t.name}</code> — {t.use}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 uppercase tracking-wide text-mist">Prompts</p>
            <ul className="space-y-1 text-foam/90">
              {PROMPT_CATALOG.map((p) => (
                <li key={p}>
                  <code className="text-amber">{p}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 uppercase tracking-wide text-mist">Resources</p>
            <ul className="space-y-1 text-foam/90">
              {RESOURCE_CATALOG.map((r) => (
                <li key={r.uri}>
                  <code className="text-teal">{r.uri}</code> — {r.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
