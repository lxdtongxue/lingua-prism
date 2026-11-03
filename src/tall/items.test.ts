import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { percentile, scoreA, weightedScore } from '../a/score.ts'
import { audioPaths, orderByBlock, scoreTrials, shuffle, validateItems, type TallItems } from './items.ts'

const read = () => JSON.parse(readFileSync(new URL('./tall_items.json', import.meta.url), 'utf8')) as TallItems

test('the shipped config is valid', () => {
  assert.deepEqual(validateItems(read()), [])
})

test('audio paths cover every clip once', () => {
  const d = read()
  const paths = audioPaths(d.sd)
  assert.equal(paths.length, 1 + 3 + 3 + 12 + 30)
  assert.equal(new Set(paths).size, paths.length)
})

test('validation names each kind of mistake', () => {
  const d = read()
  d.vl.items.pop()
  d.sd.items[0].answer = d.sd.items[1].answer
  d.sd.phraseSets[0][0].sound = 'nope'
  d.la.items[0].answer = 4
  d.la.items[1].options.pop()
  const errors = validateItems(d).join('\n')
  assert.match(errors, /vl\.items needs 20/)
  assert.match(errors, /expected 10/)
  assert.match(errors, /phrase L3_A/)
  assert.match(errors, /option index/)
  assert.match(errors, /needs 4 options/)
})

test('the shipped config is the real set, with every file present', () => {
  const d = read()
  assert.equal(d.placeholder, false)
  const paths = [...d.vl.items.map((v) => v.image), ...d.sd.sounds.map((v) => v.image), ...audioPaths(d.sd), ...d.la.study.map((v) => v.image), ...d.la.items.map((v) => v.image)]
  for (const p of paths) assert.ok(existsSync(new URL(`../../public/tall/${p}`, import.meta.url)), p)
  for (const v of d.la.items) assert.equal(new Set(v.options).size, 4, v.id)
})

test('sound items keep their blocks in order', () => {
  const order = orderByBlock(read().sd.items)
  assert.equal(order.length, 30)
  assert.ok(order.slice(0, 15).every((v) => v.block === 1))
  assert.ok(order.slice(15).every((v) => v.block === 2))
})

test('shuffle keeps every entry', () => {
  const list = Array.from({ length: 30 }, (_, i) => i)
  assert.deepEqual(shuffle(list).sort((a, b) => a - b), list)
})

test('a score is the number correct, and a timeout counts as wrong', () => {
  assert.equal(
    scoreTrials([
      { id: 'a', choice: 'x', correct: true, rtMs: 800 },
      { id: 'b', choice: 'y', correct: false, rtMs: 900 },
      { id: 'c', choice: null, correct: false, rtMs: 15000, timedOut: true },
    ]),
    1,
  )
})

test('written scores reach the A calculation', () => {
  const p = { VL: percentile('written', 'VL', 20), SD: percentile('written', 'SD', 25), LA: percentile('written', 'LA', 20) }
  for (const v of Object.values(p)) assert.equal(typeof v, 'number')
  const a = scoreA({ D_LA: 0.5, D_SD: 0.5, D_VL: 0.5 } as never, p as never)
  assert.equal(typeof a, 'number')
  assert.equal(weightedScore({ A: a }, { T: 0, A: 20, G: 0, R: 0, P: 0 }), a)
})
