import test from 'node:test'
import assert from 'node:assert/strict'
import demands from '../data/language_demands.json' with { type: 'json' }
import cases from './cases.json' with { type: 'json' }
import { percentile, scoreA, weightedScore, explainA, type Percentiles } from './score.ts'

export const USERS: Percentiles[] = [
  { LA: 85, SD: 50, VL: 50 },
  { LA: 50, SD: 85, VL: 50 },
  { LA: 50, SD: 50, VL: 85 },
  { LA: 70, SD: 70, VL: 70 },
]
const byId = new Map(demands.map((l) => [l.id, l]))

test('plan section 7: every language matches the expected A', () => {
  const bad: string[] = []
  for (const [id, expected] of Object.entries(cases as Record<string, number[]>)) {
    const lang = byId.get(id)
    assert.ok(lang, id)
    USERS.forEach((u, i) => {
      const a = scoreA(lang, u) as number
      if (Math.abs(a - expected[i]) > 0.0501) bad.push(`${id}[${i}] got ${a.toFixed(2)} want ${expected[i]}`)
    })
  }
  assert.deepEqual(bad, [])
})

// 余弦相似度：Cauchy-Schwarz 保证 A ∈ [0, 100]，
// 不再落在 [min P, max P] 内（加权平均才是凸组合）。
test('A stays within 0-100 (Cauchy-Schwarz)', () => {
  for (const l of demands) for (const u of USERS) {
    const a = scoreA(l, u) as number
    assert.ok(a >= -1e-9 && a <= 100 + 1e-9, `got ${a}`)
  }
})

// v1.3 新增：均衡型能力用户必须仍有区分度（加权平均会塌缩为常数）
test('balanced percentiles still discriminate languages', () => {
  const u: Percentiles = { LA: 60, SD: 60, VL: 60 }
  const vals = demands.map((l) => scoreA(l, u) as number)
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
  assert.ok(sd > 4, `SD too small: ${sd}`)
})

test('partial and empty scores', () => {
  // 《A指标计算公式-Astra》§七.1：三项测验不完整时综合 A 为 null
  // 缺失值不得当作 0、满分或其他默认能力值。
  assert.equal(scoreA(byId.get('pl')!, { LA: 80, SD: 40 }), null)
  assert.equal(scoreA(byId.get('pl')!, {}), null)
})

test('percentile lookup uses the matching suite', () => {
  assert.equal(percentile('written', 'LA', 25), 32)
  assert.equal(percentile('written', 'LA', 30), 90)
  assert.equal(percentile('aural', 'VL', 5), 43)
  assert.equal(percentile('written', 'VL', 21), null)
})

test('a dimension with no data leaves the weighted score', () => {
  assert.equal(weightedScore({ A: null, T: 60 }, { A: 20, T: 40 }), 60)
  assert.equal(weightedScore({ A: 50, T: 100 }, { A: 50, T: 50 }), 75)
})

test('explanation follows the largest share among scored abilities', () => {
  const ja = explainA(byId.get('ja')!, { LA: 80, SD: 40, VL: 60 })
  assert.equal(ja.kind, 'focus')
  if (ja.kind === 'focus') assert.equal(ja.ability, 'VL')
  assert.equal(explainA(byId.get('pl')!, {}).kind, 'none')
})
