import asjp from '../data/asjp_ldnd.json' with { type: 'json' }
import grammarData from '../data/grammar_similarity.json' with { type: 'json' }

const lookup = (ids: string[]) => new Map(ids.map((id, i) => [id, i]))
const asjpIndex = lookup(asjp.languages)
const grammarIndex = lookup(grammarData.languages)

const grammarValues = grammarData.similarity.flat().filter((v): v is number => v !== null)
export const GRAMMAR_MIN = Math.min(...grammarValues)
export const GRAMMAR_MAX = Math.max(...grammarValues)

// ASJP similarity is 100 − LDND. Unrelated pairs can drift just past 100, so it floors at 0.
export function similarity(a: string, b: string) {
  const i = asjpIndex.get(a)
  const j = asjpIndex.get(b)
  if (i === undefined || j === undefined) return null
  const d = asjp.ldnd[i][j]
  return d === null ? null : Math.max(0, 100 - d)
}

// Even unrelated languages share many grammar answers, so raw values start near 50.
// Scaling to the matrix range puts grammar on the same footing as ASJP.
export function grammarSimilarity(a: string, b: string) {
  const i = grammarIndex.get(a)
  const j = grammarIndex.get(b)
  if (i === undefined || j === undefined) return null
  const v = grammarData.similarity[i][j]
  return v === null ? null : ((v - GRAMMAR_MIN) / (GRAMMAR_MAX - GRAMMAR_MIN)) * 100
}

function closest(known: string[], measure: (id: string) => number | null) {
  let best: { value: number; id: string } | null = null
  for (const id of known) {
    const value = measure(id)
    if (value !== null && (!best || value > best.value)) best = { value, id }
  }
  return best
}

// T averages vocabulary and grammar. Each uses whichever known language is closer.
export function scoreT(candidate: string, known: string[]) {
  const lexical = closest(known, (id) => similarity(candidate, id))
  const grammar = closest(known, (id) => grammarSimilarity(candidate, id))
  if (!lexical || !grammar) return null
  return { value: (lexical.value + grammar.value) / 2, lexical: lexical.value, grammar: grammar.value, nearest: lexical.id, grammarNearest: grammar.id }
}
