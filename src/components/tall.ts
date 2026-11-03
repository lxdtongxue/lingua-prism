import { useSyncExternalStore } from 'react'
import { ABILITIES, percentile, type Ability, type Percentiles } from '../a/score'
import type { Trial } from '../tall/items'
import { dataChanged } from './sync-data'

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

// The test runs on its own page, so results can change while this one sleeps in
// the back-forward cache or sits in another tab.
function reload() {
  state = load()
  listeners.forEach((fn) => fn())
}
window.addEventListener('pageshow', (e) => {
  if (e.persisted) reload()
})
window.addEventListener('storage', (e) => {
  if (e.key === KEY) reload()
})
window.addEventListener('lp-state-imported', reload)

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* results just won't survive a reload */
  }
  listeners.forEach((fn) => fn())
  dataChanged('tall-results')
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

// Guest records stay local; session.ts syncs records for token accounts.
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
