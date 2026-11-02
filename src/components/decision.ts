import { useSyncExternalStore } from 'react'
import { emptyAnswers, SLIDER_DEFAULT, type Answers, type Scored, type Tier } from '../decision/score'

const KEY = 'decision-state'

type State = { tier: Tier; answers: Answers; sliders: Record<Scored, number> }

const fresh = (): State => ({ tier: 'basic', answers: emptyAnswers(), sliders: { G: SLIDER_DEFAULT, R: SLIDER_DEFAULT, P: SLIDER_DEFAULT } })

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (s?.answers) return { ...fresh(), ...s, answers: { ...emptyAnswers(), ...s.answers } }
  } catch {
    /* nothing saved, or storage is blocked */
  }
  return fresh()
}

let state = load()
const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* answers just won't survive a reload */
  }
  listeners.forEach((fn) => fn())
}

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

export const setTier = (tier: Tier) => commit({ ...state, tier })
export const patchAnswers = (patch: Partial<Answers>) => commit({ ...state, answers: { ...state.answers, ...patch } })
export const setSlider = (d: Scored, v: number) => commit({ ...state, sliders: { ...state.sliders, [d]: v } })

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export const useDecision = () => useSyncExternalStore(subscribe, () => state)
