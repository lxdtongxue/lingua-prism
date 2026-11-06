/**
 * A 分数公式对比：加权平均 vs 短板惩罚 vs 交互项。
 * 运行：node src/decision/a-formula-compare.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { scoreA, type Lang as Demand } from '../src/a/score.ts'
import { LANGS } from '../src/decision/score.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const demands = JSON.parse(readFileSync(resolve(__dir, '../src/data/language_demands.json'), 'utf-8'))
const ALL = (demands as { id: string }[]).map((d) => d.id)
type Pct = { LA: number; SD: number; VL: number }
type D = { LA: number; SD: number; VL: number }

const getD = (id: string): D => {
  const ld = LANGS.find((x) => x.id === id)!
  return { LA: ld.D_LA, SD: ld.D_SD, VL: ld.D_VL }
}

// 公式 1：现状 —— 加权平均
function fWeighted(D: D, P: Pct) {
  const num = D.LA * P.LA + D.SD * P.SD + D.VL * P.VL
  const den = D.LA + D.SD + D.VL
  return den > 0 ? num / den : 0
}

// 公式 2：短板惩罚（推荐）
function fWeak(D: D, P: Pct, alpha = 20) {
  const cands = [
    P.LA - alpha * D.LA,
    P.SD - alpha * D.SD,
    P.VL - alpha * D.VL,
  ]
  return Math.max(0, Math.min(...cands))
}

// 公式 3：交互项（需求 × 短板）
function fInteract(D: D, P: Pct, alpha = 0.6) {
  const meanP = (P.LA + P.SD + P.VL) / 3
  const penalty = alpha * (D.LA * (1 - P.LA / 100) + D.SD * (1 - P.SD / 100) + D.VL * (1 - P.VL / 100)) / 3
  return Math.max(0, meanP - penalty * 10)
}

function stats(arr: number[]) {
  const n = arr.length
  const mean = arr.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  return { mean, sd, min: Math.min(...arr), max: Math.max(...arr), range: Math.max(...arr) - Math.min(...arr) }
}

const PROFILES: [string, Pct][] = [
  ['本次测试 (71,55,62)', { LA: 71, SD: 55, VL: 62 }],
  ['均衡型 (60,60,60)', { LA: 60, SD: 60, VL: 60 }],
  ['分化型 (90,30,50)', { LA: 90, SD: 30, VL: 50 }],
  ['极端型 (95,5,45)', { LA: 95, SD: 5, VL: 45 }],
]

const FORMULAS: [string, (d: D, p: Pct) => number][] = [
  ['① 加权平均（现状）', fWeighted],
  ['② 短板惩罚（推荐）', fWeak],
  ['③ 交互项', fInteract],
]

const log = (s = '') => console.log(s)
log('================================================================')
log(' A 分数公式对比 · 区分度诊断')
log('================================================================\n')

log('维度         画像                 SD      极差    范围')
log('-'.repeat(78))
for (const [fname, f] of FORMULAS) {
  for (const [pname, p] of PROFILES) {
    const arr = ALL.map((id) => f(getD(id), p))
    const s = stats(arr)
    const flag = s.sd > 8 ? '[OK]' : s.sd > 4 ? '[~ ]' : '[!!]'
    log(`${fname.padEnd(12)} ${pname.padEnd(20)} ${s.sd.toFixed(2).padStart(6)} ${s.range.toFixed(1).padStart(7)}   ${s.min.toFixed(1)}~${s.max.toFixed(1)}  ${flag}`)
  }
  log('')
}

log('=' .repeat(78))
log('结论')
log('='.repeat(78))
log('· 均衡型 P=(60,60,60) 是关键测试：加权平均必塌成常数，')
log('  短板惩罚应仍有区分度（因为取决于 D 的 max）。')
log('· 若短板惩罚的 SD 显著高于加权平均 → 推荐改公式。')
