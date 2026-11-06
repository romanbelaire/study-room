import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultHarness, type HarnessState } from './blueprint.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const HARNESS_PATH = process.env.LATTICE_HARNESS_PATH
  ? resolve(process.env.LATTICE_HARNESS_PATH)
  : resolve(root, '.lattice/harness-state.json')

export function loadHarness(): HarnessState {
  if (!existsSync(HARNESS_PATH)) {
    const fresh = defaultHarness()
    saveHarness(fresh)
    return fresh
  }
  const raw = readFileSync(HARNESS_PATH, 'utf8')
  return JSON.parse(raw) as HarnessState
}

export function saveHarness(state: HarnessState): void {
  mkdirSync(dirname(HARNESS_PATH), { recursive: true })
  const next = { ...state, updatedAt: new Date().toISOString() }
  writeFileSync(HARNESS_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8')
}

export function touchTool(state: HarnessState, tool: string, probe?: string): HarnessState {
  const next: HarnessState = {
    ...state,
    lastTool: tool,
    lastProbe: probe ?? state.lastProbe,
    updatedAt: new Date().toISOString(),
  }
  saveHarness(next)
  return next
}
