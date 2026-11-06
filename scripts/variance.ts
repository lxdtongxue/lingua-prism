/**
 * 方差分析：定位「Top-3 对权重不敏感」的原因。
 * 假设 H1：T/A 分数方差 >> G/R/P，总分被 T/A 主导。
 * 运行：node src/decision/variance.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { scoreT } from '../src/a/similarity.ts'
import { scoreA, type Lang as Demand } from '../src/a/score.ts'
import { LANGS, scoresFor, type Answers } from '../src/decision/score.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const demands = JSON.parse(readFileSync(resolve(__dir, '../src/data/language_demands.json'), 'utf-8'))

const ALL = (demands as { id: string }[]).map((d) => d.id)
const PERCENTILES = { LA: 71, SD: 55, VL: 62 }
const HAVE = ['zh', 'en']

const ANSWERS = {
  orient: {}, g1: 'study', goals: { job: 1, study: 3, travel: 1, academic: 2 },
  sub: {}, countries: { study: [], travel: [] }, mode: 'both',
  regionInterest: { 西欧: 4 }, langInterest: {}, accept: {},
  S: {}, done: true, confirmed: true, hits: [],
} as unknown as Answers

type Dim = 'T' | 'A' | 'G' | 'R' | 'P'
const DIMS: Dim[] = ['T', 'A', 'G', 'R', 'P']

const rows = ALL.map((id) => {
  const ld = LANGS.find((x) => x.id === id)!
  const s = scoresFor(ld, ANSWERS, 'sponsor')
  const a = scoreA(ld as unknown as Demand, PERCENTILES)
  const t = scoreT(id, HAVE)
  return { id, T: t?.value ?? null, A: a, G: s.G, R: s.R, P: s.P } as Record<Dim, number | null> & { id: string }
}).filter((r) => r.T != null && r.A != null)

function stats(vals: number[]) {
  const n = vals.length
  const mean = vals.reduce((a, b) => a + b, 0) / n
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  const sd = Math.sqrt(variance)
  return { n, mean, variance, sd, min: Math.min(...vals), max: Math.max(...vals), range: Math.max(...vals) - Math.min(...vals) }
}

const log = (s = '') => console.log(s)
log('================================================================')
log(' 方差分析 · 定位「Top-3 对权重不敏感」的原因')
log(`${rows.length} 门语言 · TALL 百分位 LA=71 SD=55 VL=62 · 已会 zh/en`)
log('================================================================\n')

const S: Record<Dim, ReturnType<typeof stats>> = {} as never
for (const d of DIMS) {
  const vals = rows.map((r) => r[d] as number)
  S[d] = stats(vals)
}

log('【1】各维度描述统计（25 门语言）')
log('-'.repeat(78))
log('维度   均值    标准差   方差      最小    最大    极差')
log('-'.repeat(78))
for (const d of DIMS) {
  const s = S[d]
  log(`${d}    ${s.mean.toFixed(2).padStart(6)} ${s.sd.toFixed(2).padStart(7)} ${s.variance.toFixed(2).padStart(8)} ${s.min.toFixed(1).padStart(7)} ${s.max.toFixed(1).padStart(7)} ${s.range.toFixed(1).padStart(7)}`)
}

const totalVar = DIMS.reduce((a, d) => a + S[d].variance, 0)
const totalRange = DIMS.reduce((a, d) => a + S[d].range, 0)

log('\n【2】方差占比（决定总分由谁主导）')
log('-'.repeat(78))
for (const d of DIMS) {
  const share = S[d].variance / totalVar
  const bar = '#'.repeat(Math.round(share * 60))
  log(`${d}   ${(share * 100).toFixed(1).padStart(5)}%  ${bar}`)
}
log('-'.repeat(78))
const taShare = (S.T.variance + S.A.variance) / totalVar
const grpShare = (S.G.variance + S.R.variance + S.P.variance) / totalVar
log(`T+A 合计  ${(taShare * 100).toFixed(1)}%`)
log(`G+R+P 合计 ${(grpShare * 100).toFixed(1)}%`)

log('\n【3】极差占比（更稳健的离散度度量）')
log('-'.repeat(78))
for (const d of DIMS) {
  const share = S[d].range / totalRange
  const bar = '#'.repeat(Math.round(share * 60))
  log(`${d}   ${(share * 100).toFixed(1).padStart(5)}%  ${bar}`)
}
const taRangeShare = (S.T.range + S.A.range) / totalRange
log(`T+A 合计  ${(taRangeShare * 100).toFixed(1)}%`)

log('\n【4】诊断')
log('-'.repeat(78))
log('判据：若 T+A 的方差/极差占比 > 70%，则 Top-3 由 T/A 主导，')
log('      权重（G/R/P 内部比例）怎么调都影响不大。\n')

const verdict = taShare > 0.7
  ? 'H1 成立：T/A 主导总分，权重侧无法改变 Top-3。改进方向应在 G/R/P 分数的区分度，而非权重算法。'
  : taShare > 0.5
  ? 'H1 部分成立：T/A 占优但 G/R/P 仍有影响空间。可同时优化分数区分度与权重算法。'
  : 'H1 不成立：各维度区分度相当，Top-3 稳健是因为语言本身排名差距大，属正常现象。'
log(verdict)

log('\n【5】各维度分数分布（诊断用）')
log('-'.repeat(78))
for (const d of DIMS) {
  const vals = rows.map((r) => `${r.id}:${(r[d] as number).toFixed(0)}`)
  log(`${d}  ${vals.join(' ')}`)
}
