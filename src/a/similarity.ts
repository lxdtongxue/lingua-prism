import asjp from '../data/asjp_ldnd.json' with { type: 'json' }
import grammarData from '../data/grammar_similarity.json' with { type: 'json' }

const lookup = (ids: string[]) => new Map(ids.map((id, i) => [id, i]))
const asjpIndex = lookup(asjp.languages)
const grammarIndex = lookup(grammarData.languages)
const clip = (v: number) => Math.min(100, Math.max(0, v))

// Fixed so that updating the matrix can't quietly shift existing scores.
export const GRAMMAR_MIN = 52.33
export const GRAMMAR_MAX = 93.72
export const T_WEIGHTS = { lexical: 0.5, grammar: 0.5 }

// ASJP similarity is 100 − LDND. Unrelated pairs can drift just past 100, so it floors at 0.
export function similarity(a: string, b: string) {
  const i = asjpIndex.get(a)
  const j = asjpIndex.get(b)
  if (i === undefined || j === undefined) return null
  const d = asjp.ldnd[i][j]
  return d === null ? null : clip(100 - d)
}

// Even unrelated languages share many grammar answers, so raw values start near 50.
export function grammarSimilarity(a: string, b: string) {
  const i = grammarIndex.get(a)
  const j = grammarIndex.get(b)
  if (i === undefined || j === undefined) return null
  const v = grammarData.similarity[i][j]
  return v === null ? null : clip(((v - GRAMMAR_MIN) / (GRAMMAR_MAX - GRAMMAR_MIN)) * 100)
}

export function pairT(candidate: string, known: string) {
  const lexical = similarity(candidate, known)
  const grammar = grammarSimilarity(candidate, known)
  if (lexical === null || grammar === null) return null
  return { value: T_WEIGHTS.lexical * lexical + T_WEIGHTS.grammar * grammar, lexical, grammar, nearest: known }
}

// T for a candidate comes from one real language pair: the known language closest overall.
export function scoreT(candidate: string, known: string[]) {
  let best: ReturnType<typeof pairT> = null
  for (const id of known) {
    const pair = pairT(candidate, id)
    if (pair && (!best || pair.value > best.value)) best = pair
  }
  return best
}
