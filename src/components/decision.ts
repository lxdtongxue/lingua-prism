import { useSyncExternalStore } from 'react'
import { emptyAnswers, SLIDER_DEFAULT, type Answers, type Scored, type Tier } from '../decision/score'
import { dataChanged } from './sync-data'

const KEY = 'decision-state'

type State = { tier: Tier; answers: Answers; sliders: Record<Scored, number>; anchors: { T: number; A: number }; surveyPage: number }

const fresh = (): State => ({ tier: 'basic', answers: emptyAnswers(), sliders: { G: SLIDER_DEFAULT, R: SLIDER_DEFAULT, P: SLIDER_DEFAULT }, anchors: { T: 20, A: 20 }, surveyPage: 0 })

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
  dataChanged('decision-state')
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
window.addEventListener('lp-state-imported', reload)

export const setTier = (tier: Tier) => {
  if (tier !== state.tier) commit({ ...state, tier, surveyPage: 0 })
}
export const patchAnswers = (patch: Partial<Answers>) => commit({ ...state, answers: { ...state.answers, ...patch } })
export const setSlider = (d: Scored, v: number) => commit({ ...state, sliders: { ...state.sliders, [d]: v } })
export const setAnchor = (d: 'T' | 'A', v: number, otherWeight?: number) => {
  const other = d === 'T' ? 'A' : 'T'
  commit({ ...state, anchors: { ...state.anchors, [d]: Math.max(0, Math.min(100 - (otherWeight ?? state.anchors[other]), v)) } })
}
export const setManualWeight = (d: Scored, value: number, budget: number, available: Scored[] = ['G', 'R', 'P']) => {
  if (state.tier !== 'basic' || budget <= 0 || !available.includes(d)) return
  const next = Math.max(0, Math.min(budget, value))
  const others = available.filter(k => k !== d)
  const total = others.reduce((sum, k) => sum + state.sliders[k], 0)
  const sliders = { ...state.sliders, [d]: next }
  if (!others.length) sliders[d] = budget
  for (const k of others) sliders[k] = total ? state.sliders[k] / total * (budget - next) : (budget - next) / others.length
  commit({ ...state, sliders })
}
export const setSurveyPage = (surveyPage: number) => commit({ ...state, surveyPage })

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export const useDecision = () => useSyncExternalStore(subscribe, () => state)
