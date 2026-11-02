import { useSyncExternalStore } from 'react'
import demands from '../data/language_demands.json'

const KEY = 'known-languages'

export type Slot = 'l1' | 'l2'
type State = Record<Slot, string[]>

// Chinese and English lead both lists; the rest are the other candidate languages.
export const LANGUAGES = [{ id: 'zh', zh: '中文', en: 'Chinese' }, ...demands.map(({ id, zh, en }) => ({ id, zh, en }))]
const LEAD = ['zh', 'en']

export function sortedLanguages(lang: 'zh' | 'en') {
  const collator = new Intl.Collator(lang === 'zh' ? 'zh-CN' : 'en')
  const lead = LEAD.map((id) => LANGUAGES.find((l) => l.id === id)!)
  return [...lead, ...LANGUAGES.filter((l) => !LEAD.includes(l.id)).sort((a, b) => collator.compare(a[lang], b[lang]))]
}

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    // Earlier versions allowed several per list; only the first carries over.
    if (Array.isArray(s?.l1) && Array.isArray(s?.l2)) return { l1: s.l1.slice(0, 1), l2: s.l2.slice(0, 1) }
  } catch {
    /* nothing saved, or storage is blocked */
  }
  return { l1: ['zh'], l2: ['en'] }
}

let state = load()
const listeners = new Set<() => void>()

// Each list holds one language. Picking it again clears the list, and a language
// taken from the other list moves over.
export function toggleLanguage(slot: Slot, id: string) {
  const other: Slot = slot === 'l1' ? 'l2' : 'l1'
  const on = state[slot].includes(id)
  state = {
    [slot]: on ? [] : [id],
    [other]: state[other].filter((v) => v !== id),
  } as State
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* the choice just won't survive a reload */
  }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export const useKnownLanguages = () => useSyncExternalStore(subscribe, () => state)
