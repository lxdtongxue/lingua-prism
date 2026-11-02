import { useSyncExternalStore } from 'react'
import { ABILITIES, percentile, type Ability, type Percentiles } from '../a/score'
import type { Trial } from '../tall/items'

const KEY = 'tall-results'

export type Result = { score: number; max: number; trials: Trial[]; placeholder: boolean; at: number }
type State = Partial<Record<Ability, Result>>

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s && typeof s === 'object') return s
  } catch {
    /* nothing saved, or storage is blocked */
  }
  return {}
}

let state = load()
const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* results just won't survive a reload */
  }
  listeners.forEach((fn) => fn())
}

// Only a finished subtest is ever saved, so one left halfway counts for nothing.
export const saveResult = (k: Ability, r: Result) => commit({ ...state, [k]: r })
export const clearResults = () => commit({})

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// Answers stay in this browser; nothing is sent anywhere.
export function useTall() {
  const results = useSyncExternalStore(subscribe, () => state)
  const p: Percentiles = {}
  for (const k of ABILITIES) {
    const r = results[k]
    if (!r) continue
    const v = percentile('written', k, r.score)
    if (v != null) p[k] = v
  }
  return { results, percentiles: p, count: Object.keys(p).length, placeholder: Object.values(results).some((r) => r.placeholder) }
}
