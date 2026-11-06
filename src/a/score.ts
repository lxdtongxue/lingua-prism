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

/**
 * A = 能力画像与语言难点画像的余弦相似度（0-100）。
 *
 * 为什么不用加权平均：
 * 加权平均是 P 向量的凸组合，当 P_LA=P_SD=P_VL 时对所有语言恒等于 P，
 * 区分度为 0（实测 SD=0.00）。余弦测的是「方向匹配」，
 * 即使能力完全均衡，语言的 D 向量方向仍然不同。
 *
 * 详见《GRP权重分配方案-技术规范-v1.3》附录 B。
 */
export function scoreA(lang: Lang, p: Percentiles): number | null {
  let dot = 0
  let nd = 0
  let np = 0
  let has = false
  for (const k of ABILITIES) {
    const pk = p[k]
    if (pk == null) continue
    const d = lang[`D_${k}`]
    has = true
    const w = BETA[k]
    dot += w * d * pk
    nd += w * d * d
    np += w * pk * pk
  }
  if (!has) return null
  const den = Math.sqrt(nd) * Math.sqrt(np)
  return den > 0 ? (dot / den) * 100 : null
}

/**
 * 25 门语言内线性拉伸到 0-100，改善绝对值观感。
 * 计算用 scoreA（保留几何意义），UI 展示用本函数。
 */
export function normalizeA(raw: Map<string, number>): Map<string, number> {
  const vals = [...raw.values()]
  if (!vals.length) return raw
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  if (hi - lo < 1e-9) return new Map([...raw].map(([k]) => [k, 50]))
  return new Map([...raw].map(([k, v]) => [k, (100 * (v - lo)) / (hi - lo)]))
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
