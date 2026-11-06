import { useState } from 'react'
import { KnowledgeMode } from './components/KnowledgeMode'
import { CodingMode } from './components/CodingMode'
import { DiscussionMode } from './components/DiscussionMode'
import { cn } from './lib/utils'

type Mode = 'knowledge' | 'coding' | 'discussion'

const MODES: { id: Mode; label: string }[] = [
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'coding', label: 'Coding' },
  { id: 'discussion', label: 'Discussion' },
]

export default function App() {
  const [mode, setMode] = useState<Mode>('knowledge')

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="font-display text-3xl tracking-tight text-amber">Lattice</h1>
        <nav className="flex gap-4 text-sm">
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

      <main>
        {mode === 'knowledge' && <KnowledgeMode />}
        {mode === 'coding' && <CodingMode />}
        {mode === 'discussion' && <DiscussionMode />}
      </main>
    </div>
  )
}
