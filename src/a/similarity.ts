import asjp from '../data/asjp_ldnd.json' with { type: 'json' }

const index = new Map(asjp.languages.map((id, i) => [id, i]))

// ASJP similarity is 100 − LDND. Unrelated pairs can drift just past 100, so it floors at 0.
export function similarity(a: string, b: string) {
  const i = index.get(a)
  const j = index.get(b)
  if (i === undefined || j === undefined) return null
  const d = asjp.ldnd[i][j]
  return d === null ? null : Math.max(0, 100 - d)
}

// T for a candidate is its similarity to the closest language the learner knows.
export function scoreT(candidate: string, known: string[]) {
  let best: { value: number; nearest: string } | null = null
  for (const id of known) {
    const value = similarity(candidate, id)
    if (value !== null && (!best || value > best.value)) best = { value, nearest: id }
  }
  return best
}
