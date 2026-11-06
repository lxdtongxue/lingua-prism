/**
 * A 公式第二轮：余弦相似度 vs z-score 标准化 vs 混合。
 * 重点看：均衡型和极端型是否都能区分。
 * 运行：node src/decision/a-formula-v2.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
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

// ① 加权平均（现状）
const fWeighted = (d: D, p: Pct) =>
  (d.LA * p.LA + d.SD * p.SD + d.VL * p.VL) / (d.LA + d.SD + d.VL || 1)

// ④ 余弦相似度：测方向匹配，不测数值平均
const fCos = (d: D, p: Pct) => {
  const dot = d.LA * p.LA + d.SD * p.SD + d.VL * p.VL
  const nd = Math.sqrt(d.LA ** 2 + d.SD ** 2 + d.VL ** 2)
  const np = Math.sqrt(p.LA ** 2 + p.SD ** 2 + p.VL ** 2)
  return (nd && np) ? (dot / (nd * np)) * 100 : 0
}

// ⑤ 几何平均短板惩罚
const fGeo = (d: D, p: Pct, alpha = 20, eps = 1) => {
  const v = [p.LA - alpha * d.LA, p.SD - alpha * d.SD, p.VL - alpha * d.VL]
    .map((x) => Math.max(eps, x))
  return Math.cbrt(v[0] * v[1] * v[2])
}

// ⑥ z-score 标准化（保证 SD≈10）
function fZScore(f: (d: D, p: Pct) => number) {
  return (ids: string[], p: Pct) => {
    const raw = ids.map((id) => f(getD(id), p))
    const n = raw.length
    const mean = raw.reduce((a, b) => a + b, 0) / n
    const sd = Math.sqrt(raw.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1
    return raw.map((v) => 50 + 10 * (v - mean) / sd)
  }
}

function stats(arr: number[]) {
  const n = arr.length
  const mean = arr.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  return { mean, sd, min: Math.min(...arr), max: Math.max(...arr), range: Math.max(...arr) - Math.min(...arr) }
}

const PROFILES: [string, Pct][] = [
  ['本次 (71,55,62)', { LA: 71, SD: 55, VL: 62 }],
  ['均衡 (60,60,60)', { LA: 60, SD: 60, VL: 60 }],
  ['分化 (90,30,50)', { LA: 90, SD: 30, VL: 50 }],
  ['极端 (95,5,45)',  { LA: 95, SD: 5,  VL: 45 }],
]

const log = (s = '') => console.log(s)
log('================================================================')
log(' A 公式第二轮 · 余弦 / 几何短板 / z-score 标准化')
log('================================================================\n')

log('公式              画像              SD      极差    范围')
log('-'.repeat(78))

const list: [string, (ids: string[], p: Pct) => number[]][] = [
  ['① 加权平均', (ids, p) => ids.map((id) => fWeighted(getD(id), p))],
  ['④ 余弦相似度', (ids, p) => ids.map((id) => fCos(getD(id), p))],
  ['⑤ 几何短板', (ids, p) => ids.map((id) => fGeo(getD(id), p))],
  ['⑥z 加权平均', fZScore(fWeighted)],
  ['⑥z 余弦', fZScore(fCos)],
  ['⑥z 几何短板', fZScore(fGeo)],
]

for (const [name, fn] of list) {
  for (const [pname, p] of PROFILES) {
    const s = stats(fn(ALL, p))
    const flag = s.sd > 8 ? '[OK]' : s.sd > 4 ? '[~ ]' : '[!!]'
    log(`${name.padEnd(16)} ${pname.padEnd(17)} ${s.sd.toFixed(2).padStart(6)} ${s.range.toFixed(1).padStart(7)}   ${s.min.toFixed(1)}~${s.max.toFixed(1)}  ${flag}`)
  }
  log('')
}

log('='.repeat(78))
log('判据')
log('='.repeat(78))
log('· 均衡型 SD > 4  → 公式对无差异能力用户仍有区分度')
log('· 极端型 SD > 4  → 公式不过度惩罚短板')
log('· 全部 SD ≈ 10   → z-score 版本，区分度恒定')
