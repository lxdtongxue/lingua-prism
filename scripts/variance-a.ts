/**
 * A 分数区分度诊断：换不同能力画像，看 A 还有没有区分度。
 * 运行：node src/decision/variance-a.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { scoreA, type Lang as Demand } from '../src/a/score.ts'
import { LANGS } from '../src/decision/score.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const demands = JSON.parse(readFileSync(resolve(__dir, '../src/data/language_demands.json'), 'utf-8'))
const ALL = (demands as { id: string }[]).map((d) => d.id)

const PROFILES: [string, { LA: number; SD: number; VL: number }][] = [
  ['本次测试 (71,55,62)', { LA: 71, SD: 55, VL: 62 }],   // 三者接近
  ['均衡型 (60,60,60)',  { LA: 60, SD: 60, VL: 60 }],   // 完全相同
  ['分化型 (90,30,50)',  { LA: 90, SD: 30, VL: 50 }],   // 差距大
  ['极端型 (95,5,45)',   { LA: 95, SD: 5,  VL: 45 }],   // 极端
]

const log = (s = '') => console.log(s)
log('================================================================')
log(' A 分数区分度诊断 · 四种能力画像')
log('================================================================\n')

for (const [name, p] of PROFILES) {
  const vals = ALL.map((id) => {
    const ld = LANGS.find((x) => x.id === id)!
    return { id, a: scoreA(ld as unknown as Demand, p) }
  }).filter((x) => x.a != null) as { id: string; a: number }[]

  const arr = vals.map((x) => x.a)
  const n = arr.length
  const mean = arr.reduce((s, v) => s + v, 0) / n
  const sd = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
  const min = Math.min(...arr), max = Math.max(...arr)
  const pSpread = Math.max(p.LA, p.SD, p.VL) - Math.min(p.LA, p.SD, p.VL)

  log(`${name}`)
  log(`  P 极差 = ${pSpread.toFixed(0).padStart(3)}   A 均值 = ${mean.toFixed(2)}   SD = ${sd.toFixed(2)}   极差 = ${(max - min).toFixed(2)}`)
  log(`  A 范围: ${min.toFixed(1)} ~ ${max.toFixed(1)}`)
  log(`  → ${sd > 8 ? '[OK] 区分度良好' : sd > 4 ? '[~] 区分度一般' : '[!!] 区分度不足，接近常数'}`)
  log('')
}

log('================================================================')
log(' 结论')
log('================================================================')
log('若 P 极差小 → A 塌缩为常数（加权平均的数学必然）')
log('若 P 极差大 → A 有区分度，但仍受 D_k 分化程度限制')
log('')
log('推论：A 的区分度上限 ≈ (max P − min P) × D_k 的分化程度')
