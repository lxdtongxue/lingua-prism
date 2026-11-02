import test from 'node:test'
import assert from 'node:assert/strict'
import demands from '../data/language_demands.json' with { type: 'json' }
import cases from './cases.json' with { type: 'json' }
import { percentile, scoreA, weightedScore, explainA, type Percentiles } from './score.ts'

const USERS: Percentiles[] = [
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

test('A stays between the lowest and highest percentile', () => {
  for (const l of demands) for (const u of USERS) {
    const a = scoreA(l, u) as number
    const v = Object.values(u) as number[]
    assert.ok(a >= Math.min(...v) - 1e-9 && a <= Math.max(...v) + 1e-9)
  }
})

test('partial and empty scores', () => {
  assert.ok(Math.abs((scoreA(byId.get('pl')!, { LA: 80, SD: 40 }) as number) - 64.5) < 0.05)
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
