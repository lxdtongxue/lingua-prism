import norms from '../data/tall_norms.json' with { type: 'json' }

export const ABILITIES = ['LA', 'SD', 'VL'] as const
export type Ability = (typeof ABILITIES)[number]
export type Percentiles = Partial<Record<Ability, number>>
export type Suite = 'written' | 'aural'
export type Lang = { id: string } & Record<`D_${Ability}`, number>

// Configuration from the A quantification plan, section 8.
export const BETA: Record<Ability, number> = { LA: 1, SD: 1, VL: 1 }
export const A_DEFAULT_WEIGHT = 20
export const DEMO_PERCENTILE_INPUT = false
// At or below these raw scores a result is near chance.
export const CHANCE_FLOOR: Partial<Record<Ability, number>> = { SD: 10, LA: 8 }

export const maxScore = (k: Ability) => norms.suites.written[k].max

export function percentile(suite: Suite, k: Ability, raw: number): number | null {
  const table = norms.suites[suite][k].percentile_table as Record<string, number>
  return table[String(raw)] ?? null
}

export function scoreA(lang: Lang, p: Percentiles): number | null {
  let num = 0
  let den = 0
  for (const k of ABILITIES) {
    const pk = p[k]
    if (pk == null) continue
    const w = BETA[k] * lang[`D_${k}`]
    num += w * pk
    den += w
  }
  return den > 0 ? num / den : null
}

// How each language's difficulty divides, among the abilities the learner has scores for.
export function demandShares(lang: Lang, among: readonly Ability[] = ABILITIES) {
  const total = among.reduce((sum, k) => sum + lang[`D_${k}`], 0)
  return Object.fromEntries(among.map((k) => [k, lang[`D_${k}`] / total])) as Partial<Record<Ability, number>>
}

export type Why = { kind: 'none' } | { kind: 'balanced'; even: boolean } | { kind: 'focus'; ability: Ability; share: number; percentile: number; even: boolean }

export function explainA(lang: Lang, p: Percentiles): Why {
  const have = ABILITIES.filter((k) => p[k] != null)
  if (!have.length) return { kind: 'none' }
  const values = have.map((k) => p[k] as number)
  const even = have.length > 1 && Math.max(...values) - Math.min(...values) < 10
  const shares = demandShares(lang, have)
  const top = have.reduce((a, b) => ((shares[b] as number) > (shares[a] as number) ? b : a))
  const share = shares[top] as number
  if (share < 0.4) return { kind: 'balanced', even }
  return { kind: 'focus', ability: top, share, percentile: p[top] as number, even }
}

// Score = Σ w·S ÷ Σ w, skipping any dimension a language has no data for.
export function weightedScore<D extends string>(values: Partial<Record<D, number | null>>, weights: Record<D, number>) {
  let num = 0
  let den = 0
  for (const d of Object.keys(weights) as D[]) {
    const v = values[d]
    if (v == null || !weights[d]) continue
    num += weights[d] * v
    den += weights[d]
  }
  return den > 0 ? num / den : null
}
