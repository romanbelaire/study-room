import { useState } from 'react'
import { BookOpen, Code2, MessagesSquare } from 'lucide-react'
import { KnowledgeMode } from './components/KnowledgeMode'
import { CodingMode } from './components/CodingMode'
import { DiscussionMode } from './components/DiscussionMode'
import { cn } from './lib/utils'

type Mode = 'knowledge' | 'coding' | 'discussion'

const MODES: { id: Mode; label: string; icon: typeof BookOpen }[] = [
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'coding', label: 'Coding', icon: Code2 },
  { id: 'discussion', label: 'Discussion', icon: MessagesSquare },
]

export default function App() {
  const [mode, setMode] = useState<Mode>('knowledge')

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-stretch justify-center px-3 py-4 sm:px-5 sm:py-8">
      <div className="animate-rise flex w-full flex-col overflow-hidden rounded-xl border border-line/80 bg-panel/90 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <header className="relative border-b border-line/80 bg-gradient-to-r from-ink/80 via-panel to-panel-2/90 px-4 py-3 sm:px-5">
          <div className="mb-3 flex items-center gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-coral/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-teal/90" />
            <span className="ml-2 font-mono text-[10px] text-mist/80">lattice.app — study desk</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-3xl tracking-tight text-foam sm:text-4xl">
                Lattice
              </p>
              <p className="mt-1 max-w-xl text-sm text-mist">
                Compact RS interview desk — knowledge checks, coding drills, and an MCP harness your
                agent attaches to for longer-form loop coaching.
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-ink/50 p-1">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:text-sm',
                    mode === id
                      ? 'bg-teal text-ink'
                      : 'text-mist hover:bg-panel-2 hover:text-foam',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="min-h-[28rem] flex-1 p-4 sm:p-5">
          {mode === 'knowledge' && <KnowledgeMode />}
          {mode === 'coding' && <CodingMode />}
          {mode === 'discussion' && <DiscussionMode />}
        </main>

        <footer className="border-t border-line/70 px-4 py-2 text-[11px] text-mist/80 sm:px-5">
          Seeded for Roman Belaire · discussion via <code className="text-teal/90">npm run mcp</code>{' '}
          · blueprint-aligned screening → mid → onsite
        </footer>
      </div>
    </div>
  )
}
