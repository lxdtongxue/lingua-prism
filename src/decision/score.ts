import data from '../data/decision_data.json' with { type: 'json' }
import countryMap from '../data/countries.json' with { type: 'json' }
import { weightedScore } from '../a/score.ts'

export const GOALS = ['job', 'study', 'travel', 'academic'] as const
export type Goal = (typeof GOALS)[number]
export const JOB_SUBS = ['job_trade', 'job_translation', 'job_tech', 'job_engineering', 'job_tourism', 'job_education'] as const
export const ACAD_SUBS = ['acad_humanities', 'acad_stem', 'acad_arts'] as const
export type Detail = (typeof JOB_SUBS)[number] | (typeof ACAD_SUBS)[number]
export type Mode = 'offline' | 'online' | 'both'
export type Tier = 'basic' | 'sponsor'
export type Accept = 'VL' | 'SD' | 'LA'
export type Scored = 'G' | 'R' | 'P'

export type LangDecision = {
  id: string
  zh: string
  region: string
  g: Record<Goal, number>
  r: { coverage: number; quality: number; offline: number; online: number }
  g_detail: Record<Detail, number>
  r_raw: Record<'coverage' | 'quality' | 'offline' | 'online', number | null>
  D_LA: number
  D_VL: number
  D_SD: number
}

export type UserDecision = {
  goals: Record<Goal, number>
  mode: Mode
  regionInterest: Record<string, number>
  langInterest?: Record<string, number>
  accept: Partial<Record<Accept, number>>
}

export type UserDetail = UserDecision & {
  subgoals: Partial<Record<Detail | Goal, number>>
  countries: { study?: string[]; travel?: string[] }
}

export const LANGS = data as unknown as LangDecision[]
export const COUNTRIES = countryMap as Record<string, string[]>
export const REGIONS = ['英语世界', '东亚', '西欧', '南欧与拉美', '俄语区与中亚', '西亚与北非', '东南亚', '南亚', '中东欧']
export const P_WEIGHTS = { culture: 0.6, feature: 0.4 }
export const SLIDER_MAX = 40
export const SLIDER_DEFAULT = 20
export const AUTO_TOTAL = 60

// r_raw columns the team has signed off for percentile scoring. Coverage is complete
// in the data, but the plan's test cases still expect tiers, so none are live yet.
export const R_PCT_COLUMNS: (keyof LangDecision['r_raw'])[] = []

export const score = (t: number) => (t - 1) * 25

export function scoreG(l: LangDecision, u: UserDecision) {
  const s = GOALS.reduce((a, k) => a + u.goals[k], 0)
  if (s === 0) return null
  return GOALS.reduce((a, k) => a + u.goals[k] * score(l.g[k]), 0) / s
}

export const modeTier = (l: LangDecision, mode: Mode) => (mode === 'offline' ? l.r.offline : mode === 'online' ? l.r.online : Math.max(l.r.offline, l.r.online))

export function scoreR(l: LangDecision, u: Pick<UserDecision, 'mode'>) {
  return (score(l.r.coverage) + score(l.r.quality) + score(modeTier(l, u.mode))) / 3
}

export function pct(l: LangDecision, column: keyof LangDecision['r_raw'], langs = LANGS) {
  const mine = l.r_raw[column] as number
  const others = langs.filter((x) => x.id !== l.id).map((x) => x.r_raw[column] as number)
  return ((others.filter((v) => v < mine).length + 0.5 * others.filter((v) => v === mine).length + 0.5) / langs.length) * 100
}

// Section 2A.2: a finished column of real numbers replaces its tier.
export function scoreRDetail(l: LangDecision, u: Pick<UserDecision, 'mode'>, columns = R_PCT_COLUMNS, langs = LANGS) {
  const ready = (c: keyof LangDecision['r_raw']) => columns.includes(c) && langs.every((x) => x.r_raw[c] !== null)
  const part = (c: 'coverage' | 'quality') => (ready(c) ? pct(l, c, langs) : score(l.r[c]))
  const key: 'offline' | 'online' = u.mode === 'both' ? (l.r.offline >= l.r.online ? 'offline' : 'online') : u.mode
  const x = ready(key) ? pct(l, key, langs) : score(modeTier(l, u.mode))
  return (part('coverage') + part('quality') + x) / 3
}

export function scoreP(l: LangDecision, u: UserDecision) {
  const rating = u.langInterest?.[l.id] ?? u.regionInterest[l.region]
  const p1 = rating == null ? null : (rating - 1) * 25
  const fits: number[] = []
  for (const k of ['VL', 'SD', 'LA'] as const) {
    const acc = u.accept[k]
    if (acc == null) continue
    const s = (acc - 3) / 2
    const x = (l[`D_${k}`] - 0.2) / 0.8
    fits.push(50 + 50 * s * (2 * x - 1))
  }
  const p2 = fits.length ? fits.reduce((a, b) => a + b, 0) / fits.length : null
  if (p1 == null && p2 == null) return null
  if (p1 == null) return p2
  if (p2 == null) return p1
  return P_WEIGHTS.culture * p1 + P_WEIGHTS.feature * p2
}

export function countryMatch(l: LangDecision, picked: string[], map = COUNTRIES) {
  return (picked.filter((c) => map[c]?.includes(l.id)).length / picked.length) * 100
}

export function scoreGDetail(l: LangDecision, u: UserDetail, map = COUNTRIES) {
  let num = 0
  let den = 0
  for (const [s, g] of Object.entries(u.subgoals)) {
    if (!g) continue
    let v: number
    if (s === 'study' || s === 'travel') {
      const picked = u.countries[s]
      v = picked?.length ? countryMatch(l, picked, map) : score(l.g[s])
    } else if (s === 'job' || s === 'academic') v = score(l.g[s])
    else v = score(l.g_detail[s as Detail])
    num += g * v
    den += g
  }
  return den ? num / den : null
}

// Section 1.2: the top sub-goal in a group takes the G2 value, so splitting a goal
// into sub-goals never dilutes it. A group that wasn't answered uses the base column.
export function scaleGroup<K extends string>(goal: number, subs: readonly K[], answers: Partial<Record<K, number>>) {
  const top = Math.max(0, ...subs.map((s) => answers[s] ?? 0))
  if (goal < 2 || top === 0) return null
  return Object.fromEntries(subs.map((s) => [s, ((answers[s] ?? 0) * goal) / top])) as Record<K, number>
}

export type Answers = {
  orient: Record<string, number>
  g1: Goal | 'none' | null
  goals: Partial<Record<Goal, number>>
  sub: Partial<Record<Detail, number>>
  countries: { study: string[]; travel: string[] }
  mode: Mode | null
  regionInterest: Record<string, number>
  langInterest: Record<string, number>
  accept: Partial<Record<Accept, number>>
  S: Partial<Record<'S1' | 'S2' | 'S3', number>>
  done: boolean
  confirmed: boolean
  hits: string[]
}

export const emptyAnswers = (): Answers => ({
  orient: {},
  g1: null,
  goals: {},
  sub: {},
  countries: { study: [], travel: [] },
  mode: null,
  regionInterest: {},
  langInterest: {},
  accept: {},
  S: {},
  done: false,
  confirmed: false,
  hits: [],
})

export function subgoalsOf(a: Answers): UserDetail['subgoals'] {
  const job = scaleGroup(a.goals.job ?? 0, JOB_SUBS, a.sub)
  const acad = scaleGroup(a.goals.academic ?? 0, ACAD_SUBS, a.sub)
  return { ...(job ?? { job: a.goals.job ?? 0 }), study: a.goals.study ?? 0, travel: a.goals.travel ?? 0, ...(acad ?? { academic: a.goals.academic ?? 0 }) }
}

export function scoresFor(l: LangDecision, a: Answers, tier: Tier): Record<Scored, number | null> {
  const accept = tier === 'sponsor' ? a.accept : { VL: a.accept.VL, SD: a.accept.SD }
  const base: UserDecision = { goals: { job: a.goals.job ?? 0, study: a.goals.study ?? 0, travel: a.goals.travel ?? 0, academic: a.goals.academic ?? 0 }, mode: a.mode ?? 'both', regionInterest: a.regionInterest, accept }
  if (tier === 'basic') return { G: scoreG(l, base), R: scoreR(l, base), P: scoreP(l, base) }
  return {
    G: scoreGDetail(l, { ...base, subgoals: subgoalsOf(a), countries: { study: (a.goals.study ?? 0) >= 2 ? a.countries.study : [], travel: (a.goals.travel ?? 0) >= 2 ? a.countries.travel : [] } }),
    R: scoreRDetail(l, base),
    P: scoreP(l, { ...base, langInterest: a.langInterest }),
  }
}

const likert = (a: number[], rev: boolean[]) => a.reduce((s, v, i) => s + (rev[i] ? 6 - v : v), 0) / a.length
const SCALE: Record<number, number> = { 3: 4, 1: 2, [-1]: 0.5, [-3]: 0.25 }

export type WeightInput = { G: number[]; R: number[]; P: number[]; S1: number; S2: number; S3: number }

export function questionnaireWeights(ans: WeightInput) {
  const rev = [false, false, false, true]
  const all = [...ans.G, ...ans.R, ...ans.P]
  const straight = all.every((v) => v === all[0])
  const s = { G: likert(ans.G, rev), R: likert(ans.R, rev), P: likert(ans.P, rev) }
  const den = s.G + s.R + s.P - 1.5
  const piL = [(s.G - 0.5) / den, (s.R - 0.5) / den, (s.P - 0.5) / den]

  const [gr, gp, rp] = [SCALE[ans.S2], SCALE[ans.S1], SCALE[ans.S3]]
  const M = [
    [1, gr, gp],
    [1 / gr, 1, rp],
    [1 / gp, 1 / rp, 1],
  ]
  const g = M.map((r) => Math.cbrt(r[0] * r[1] * r[2]))
  const sum = g.reduce((a, b) => a + b, 0)
  const piS = g.map((v) => v / sum)
  const Mpi = M.map((r) => r[0] * piS[0] + r[1] * piS[1] + r[2] * piS[2])
  const CR = (Mpi.reduce((a, v, i) => a + v / piS[i], 0) / 3 - 3) / 2 / 0.58

  const k = straight ? 0 : 0.5
  const pi = piL.map((v, i) => k * v + (1 - k) * piS[i])
  const cyclic = (ans.S2 > 0 && ans.S3 > 0 && ans.S1 < 0) || (ans.S2 < 0 && ans.S3 < 0 && ans.S1 > 0)
  return { G: 60 * pi[0], R: 60 * pi[1], P: 60 * pi[2], CR, cyclic, straight, s, piL, piS, pi }
}

export const ORIENT_ITEMS = { G: ['O1', 'O4', 'O7', 'O10'], R: ['O2', 'O5', 'O8', 'O11'], P: ['O3', 'O6', 'O9', 'O12'] } as const

export function weightInput(a: Answers): WeightInput | null {
  const pick = (ids: readonly string[]) => ids.map((id) => a.orient[id])
  const out = { G: pick(ORIENT_ITEMS.G), R: pick(ORIENT_ITEMS.R), P: pick(ORIENT_ITEMS.P), S1: a.S.S1 as number, S2: a.S.S2 as number, S3: a.S.S3 as number }
  return [...out.G, ...out.R, ...out.P].every(v => Number.isInteger(v) && v >= 1 && v <= 5)
    && [out.S1, out.S2, out.S3].every(v => [3, 1, -1, -3].includes(v)) ? out : null
}

export type Weights = Record<'T' | 'A' | Scored, number>

// T and A never depend on the tier. A dimension with no score gives its share back.
export function autoWeights(pi: Record<Scored, number>, missing: Scored[], budget = AUTO_TOTAL) {
  const dims = (['G', 'R', 'P'] as const).filter((d) => !missing.includes(d))
  const sum = dims.reduce((a, d) => a + pi[d], 0)
  return { G: 0, R: 0, P: 0, ...Object.fromEntries(dims.map((d) => [d, sum ? (budget * pi[d]) / sum : budget / dims.length])) } as Record<Scored, number>
}

export function configuredWeights(anchors: { T: number; A: number }, ratio: Record<Scored, number>, missing: (keyof Weights)[]): Weights {
  const t = missing.includes('T') ? 0 : Math.max(0, Math.min(100, anchors.T))
  const a = missing.includes('A') ? 0 : Math.max(0, Math.min(100 - t, anchors.A))
  return { T: t, A: a, ...autoWeights(ratio, missing.filter((d): d is Scored => d === 'G' || d === 'R' || d === 'P'), 100 - t - a) }
}

export function bestGoal(goals: Partial<Record<Goal, number>>) {
  return GOALS.reduce((best, k) => ((goals[k] ?? 0) > (goals[best] ?? 0) ? k : best), GOALS[0])
}

export const interestOf = (l: LangDecision, a: Answers) => a.langInterest[l.id] ?? a.regionInterest[l.region] ?? null

// Section 1.5: the language rated highest decides the region named in the dilemmas.
export function topRegion(a: Answers, langs = LANGS) {
  let best: LangDecision | null = null
  for (const l of langs) {
    const v = interestOf(l, a)
    if (v != null && (!best || v > (interestOf(best, a) as number))) best = l
  }
  return best?.region ?? null
}

export type Hit = { id: 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6' | 'K7'; other?: Goal }

export function checks(a: Answers, langs = LANGS) {
  const hits: Hit[] = []
  const q = weightInput(a)
  if (a.orient.O0 !== 4) hits.push({ id: 'K1' })
  if (q) {
    const r = questionnaireWeights(q)
    if (r.straight) hits.push({ id: 'K2' })
    if (a.g1 && a.g1 !== 'none' && Math.max(...GOALS.map((k) => a.goals[k] ?? 0)) > (a.goals[a.g1] ?? 0)) hits.push({ id: 'K3', other: bestGoal(a.goals) })
    if (r.s.G >= 4 && GOALS.every((k) => (a.goals[k] ?? 0) <= 1)) hits.push({ id: 'K4' })
    if (r.s.P >= 4 && !langs.some((l) => (interestOf(l, a) ?? 0) >= 4)) hits.push({ id: 'K5' })
    if (r.cyclic) hits.push({ id: 'K6' })
    const top = (v: number[]) => v.indexOf(Math.max(...v))
    if (top(r.piL) !== top(r.piS) && Math.max(...r.piL) > 0.45 && Math.max(...r.piS) > 0.45) hits.push({ id: 'K7' })
  }
  return hits
}

type Row = { id: string; values: Partial<Record<'T' | 'A' | Scored, number | null>> }
const DIMS = ['T', 'A', 'G', 'R', 'P'] as const

const ranked = (rows: Row[], w: Weights) => [...rows].sort((x, y) => (weightedScore(y.values, w) ?? -1) - (weightedScore(x.values, w) ?? -1))

// Section 6: only G, R and P move, so A's score and meaning stay the same in every tier.
export function shifted(w: Weights, d: Scored): Weights {
  const others = (['G', 'R', 'P'] as const).filter((x) => x !== d)
  const budget = w.G + w.R + w.P
  const next = Math.min(budget, w[d] + 10)
  const rest = others.reduce((a, x) => a + w[x], 0)
  const out = { ...w, [d]: next }
  for (const x of others) out[x] = rest ? (w[x] * (budget - next)) / rest : 0
  return out
}

export function report(rows: Row[], w: Weights) {
  const order = ranked(rows, w).filter(row => weightedScore(row.values, w) !== null)
  return order.slice(0, 5).map((row, i) => {
    const have = DIMS.filter((d) => row.values[d] != null && w[d] > 0)
    const by = (fn: (d: (typeof DIMS)[number]) => number) => [...have].sort((a, b) => fn(b) - fn(a))
    const top = by((d) => w[d] * (row.values[d] as number)).filter(d => (row.values[d] as number) > 0).slice(0, 2)
    const weak = by((d) => -(row.values[d] as number))[0]
    const flips = (['G', 'R', 'P'] as const).flatMap((d) => {
      const first = ranked(rows, shifted(w, d))[0]
      return first.id !== order[0].id ? [{ dim: d, id: first.id }] : []
    })
    return { id: row.id, rank: i + 1, top, weak, flips }
  })
}
