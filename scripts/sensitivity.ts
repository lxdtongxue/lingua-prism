/**
 * §14.3 敏感性分析：检验参数 k / c / τ 的变动是否改变推荐结论。
 * 运行：node src/decision/sensitivity.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { scoreT } from '../src/a/similarity.ts'
import { scoreA, weightedScore, type Lang as Demand } from '../src/a/score.ts'
import { LANGS, scoresFor, configuredWeights, type Answers } from '../src/decision/score.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const demands = JSON.parse(readFileSync(resolve(__dir, '../src/data/language_demands.json'), 'utf-8'))

type Dim = 'G' | 'R' | 'P'
type Scale = Record<Dim, number>

const REV = [false, false, false, true]
const SCALE: Record<number, number> = { 3: 4, 1: 2, [-1]: 0.5, [-3]: 0.25 }
const likert = (a: number[], rev: boolean[]) =>
  a.reduce((s, v, i) => s + (rev[i] ? 6 - v : v), 0) / a.length

function piL(G: number[], R: number[], P: number[], c: number): Scale {
  const s = { G: likert(G, REV), R: likert(R, REV), P: likert(P, REV) }
  const den = s.G + s.R + s.P - 3 * c
  return { G: (s.G - c) / den, R: (s.R - c) / den, P: (s.P - c) / den }
}

function piS(S1: number, S2: number, S3: number): Scale {
  const gr = SCALE[S2], gp = SCALE[S1], rp = SCALE[S3]
  const M = [[1, gr, gp], [1 / gr, 1, rp], [1 / gp, 1 / rp, 1]]
  const g = M.map((r) => Math.cbrt(r[0] * r[1] * r[2]))
  const sum = g.reduce((a, b) => a + b, 0)
  return { G: g[0] / sum, R: g[1] / sum, P: g[2] / sum }
}

function blend(k: number, L: Scale, S: Scale): Scale {
  return { G: k * L.G + (1 - k) * S.G, R: k * L.R + (1 - k) * S.R, P: k * L.P + (1 - k) * S.P }
}

function blendConfident(L: Scale, S: Scale, s: Record<Dim, number>, tau: number) {
  const spread = Math.max(s.G, s.R, s.P) - Math.min(s.G, s.R, s.P)
  const lambda = Math.min(1, spread / tau)
  return { lambda, pi: blend(lambda, L, S) }
}

const ALL = (demands as { id: string }[]).map((d) => d.id)
const PERCENTILES = { LA: 71, SD: 55, VL: 62 }
const HAVE = ['zh', 'en']

function rankFor(pi: Scale, answers: Answers, T: number, A: number) {
  const w = configuredWeights({ T, A }, pi, [])
  const rows = ALL.filter((id) => !HAVE.includes(id)).map((id) => {
    const ld = LANGS.find((x) => x.id === id)!
    const s = scoresFor(ld, answers, 'sponsor')
    const a = scoreA(ld as unknown as Demand, PERCENTILES)
    const t = scoreT(id, HAVE)
    const values = { T: t?.value ?? null, A: a, ...s }
    return { id, score: weightedScore(values, w) ?? -1 }
  })
  rows.sort((x, y) => y.score - x.score)
  return rows
}

function profile(name: string, G: number[], R: number[], P: number[], S1: number, S2: number, S3: number) {
  const s = { G: likert(G, REV), R: likert(R, REV), P: likert(P, REV) }
  return { name, G, R, P, S1, S2, S3, s }
}

const PROFILES = [
  profile('A 目标导向', [5, 5, 4, 4], [3, 3, 3, 3], [2, 2, 2, 2], 3, 3, 1),
  profile('B 兴趣导向', [2, 2, 2, 2], [3, 3, 3, 3], [5, 5, 4, 4], -3, -3, -1),
  profile('C 全中性', [3, 3, 3, 3], [3, 3, 3, 3], [3, 3, 3, 3], 1, -1, 3),
]

const ANSWERS = {
  orient: {}, g1: 'study', goals: { job: 1, study: 3, travel: 1, academic: 2 },
  sub: {}, countries: { study: [], travel: [] }, mode: 'both',
  regionInterest: { 西欧: 4 }, langInterest: {}, accept: {},
  S: {}, done: true, confirmed: true, hits: [],
} as unknown as Answers

const log = (s = '') => console.log(s)

log('================================================================')
log(' §14.3 敏感性分析 · GRP 权重分配')
log(' 25 门语言 · TALL 百分位 LA=71 SD=55 VL=62 · 已会 zh/en')
log('================================================================')

log('\n【1】k / c / τ 对内部比例 π 的影响')
log('-'.repeat(72))
for (const p of PROFILES) {
  const L = piL(p.G, p.R, p.P, 0.5)
  const S = piS(p.S1, p.S2, p.S3)
  log(`\n${p.name}   s=(${p.s.G.toFixed(2)},${p.s.R.toFixed(2)},${p.s.P.toFixed(2)})`)
  log(`  πL = (${L.G.toFixed(3)}, ${L.R.toFixed(3)}, ${L.P.toFixed(3)})`)
  log(`  πS = (${S.G.toFixed(3)}, ${S.R.toFixed(3)}, ${S.P.toFixed(3)})`)

  log('  --- 固定 k ---')
  for (const k of [0, 0.25, 0.5, 0.75, 1]) {
    const pi = blend(k, L, S)
    log(`  k=${k.toFixed(2)}  π=(${pi.G.toFixed(3)}, ${pi.R.toFixed(3)}, ${pi.P.toFixed(3)})`)
  }

  log('  --- 置信 λ (τ=2.0) ---')
  const r = blendConfident(L, S, p.s, 2.0)
  log(`  λ=${r.lambda.toFixed(3)}  π=(${r.pi.G.toFixed(3)}, ${r.pi.R.toFixed(3)}, ${r.pi.P.toFixed(3)})`)

  log('  --- c 的影响 (k=0.5) ---')
  for (const c of [0, 0.25, 0.5, 0.75, 1.0]) {
    const Lc = piL(p.G, p.R, p.P, c)
    const pc = blend(0.5, Lc, S)
    log(`  c=${c.toFixed(2)}  π=(${pc.G.toFixed(3)}, ${pc.R.toFixed(3)}, ${pc.P.toFixed(3)})`)
  }

  log('  --- τ 的影响 ---')
  for (const tau of [1, 1.5, 2, 2.5, 3]) {
    const b = blendConfident(L, S, p.s, tau)
    log(`  τ=${tau.toFixed(1)}  λ=${b.lambda.toFixed(3)}  π=(${b.pi.G.toFixed(3)}, ${b.pi.R.toFixed(3)}, ${b.pi.P.toFixed(3)})`)
  }
}

log('\n\n【2】Top-3 推荐稳定性 · 扫描 k ∈ [0,1]')
log('-'.repeat(72))
const T = 20, A = 20
for (const p of PROFILES) {
  const L = piL(p.G, p.R, p.P, 0.5)
  const S = piS(p.S1, p.S2, p.S3)
  const seen = new Map<string, number>()
  const detail: string[] = []
  for (let i = 0; i <= 10; i++) {
    const k = i / 10
    const pi = blend(k, L, S)
    const top3 = rankFor(pi, ANSWERS, T, A).slice(0, 3).map((x) => x.id)
    const key = top3.join(' > ')
    seen.set(key, (seen.get(key) ?? 0) + 1)
    detail.push(`  k=${k.toFixed(1)}  ${key}`)
  }
  log(`\n${p.name}`)
  detail.forEach((d) => log(d))
  log(`  → 出现 ${seen.size} 种 Top-3 组合`)
  log(seen.size === 1 ? '  [OK] 稳健：k 全区间推荐不变' : '  [!!] 不稳：参数变动会改变推荐')
}

log('\n\n【3】五种权重方法的 Top-5 对比 (T=20, A=20)')
log('-'.repeat(72))
for (const p of PROFILES) {
  const L = piL(p.G, p.R, p.P, 0.5)
  const S = piS(p.S1, p.S2, p.S3)
  const conf = blendConfident(L, S, p.s, 2.0)
  const methods: [string, Scale][] = [
    ['等分 1:1:1', { G: 1 / 3, R: 1 / 3, P: 1 / 3 }],
    ['v1.0 k=0.5', blend(0.5, L, S)],
    [`v1.1 λ=${conf.lambda.toFixed(2)}`, conf.pi],
    ['纯量表 πL', L],
    ['纯情境 πS', S],
  ]
  log(`\n${p.name}`)
  for (const [label, pi] of methods) {
    const top = rankFor(pi, ANSWERS, T, A).slice(0, 5).map((x) => x.id).join(', ')
    log(`  ${label.padEnd(16)} ${top}`)
  }
}

log('\n\n【4】结论')
log('-'.repeat(72))
log('判据：')
log('  · 若所有画像 Top-3 在 k 全区间不变 → 结论稳健，参数不敏感')
log('  · 若翻转 → 报告翻转点，必须在 UI 提示用户')
log('  · 等分 vs 本算法的 Top-5 差异 → 决定算法是否有增益')
