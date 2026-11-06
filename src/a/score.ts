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
 * A = 能力适配参考分
 *
 *   A(L,u) = 100 - [ D_LA·(100-P_LA) + D_SD·(100-P_SD) + D_VL·(100-P_VL) ] / 3
 *
 * 依据《A指标计算公式-Astra》：
 *   含义：根据学习者当前的能力表现，评估其应对某门语言学习任务的相对有利程度。
 *         既考虑能力水平，也考虑强项是否对应语言的需求。
 *
 * 实施规则（§七）：
 *   1. 三项测验全部完成后才生成综合 A，缺失时返回 null；
 *      缺失值不得当作 0、满分或其他默认能力值。
 *   2. 不做最大最小值拉伸、不做 z-score，展示与总分使用同一个 A。
 *   3. D 值参照固定语言库与映射版本，不随候选筛选重新排名。
 *   4. 分母固定为 3，A 内部三项等权；这与用户调节的外层 A 权重是两回事。
 */
export function scoreA(lang: Lang, p: Percentiles): number | null {
  const LA = p.LA
  const SD = p.SD
  const VL = p.VL
  if (LA == null || SD == null || VL == null) return null
  const penalty =
    (lang.D_LA * (100 - LA) +
     lang.D_SD * (100 - SD) +
     lang.D_VL * (100 - VL)) / 3
  return 100 - penalty
}

export type Why = { kind: 'none' } | { kind: 'balanced'; even: boolean } | { kind: 'focus'; ability: Ability; share: number; percentile: number; even: boolean }

/** 每门语言三类难点各占多少（用于解释文字） */
export function demandShares(lang: Lang, only: readonly Ability[] = ABILITIES): Record<Ability, number> {
  const keys = [...only]
  const total = keys.reduce((a, k) => a + lang[`D_${k}`], 0) || 1
  const out = { LA: 0, SD: 0, VL: 0 } as Record<Ability, number>
  for (const k of keys) out[k] = lang[`D_${k}`] / total
  return out
}

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
