import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyAnswers, weightInput, type Answers } from './score.ts'
import { pageIndex, pageReady, pagesFor } from './flow.ts'

const complete = (): Answers => ({ ...emptyAnswers(), g1: 'none', orient: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`O${i}`, 3])), S: { S1: 3, S2: 1, S3: -1 } })

test('each mode has the intended pages and optional goal branches', () => {
  const a = emptyAnswers()
  assert.deepEqual(pagesFor(a, 'basic'), ['start', 'g1', 'g2', 'r1', 'p1', 'accept'])
  assert.equal(pagesFor(a, 'sponsor').at(-1), 'confirm')
  assert.ok(!pagesFor(a, 'sponsor').includes('g3'))
  a.goals = { job: 2, study: 3, travel: 2, academic: 2 }
  for (const page of ['g3', 'g4', 'g5', 'g6'] as const) assert.ok(pagesFor(a, 'sponsor').includes(page))
})

test('restoring progress cannot skip required answers or strand a blank confirmation', () => {
  const a = emptyAnswers()
  assert.equal(pageIndex(pagesFor(a, 'basic'), 99, a), 1)
  assert.equal(pageIndex(pagesFor(a, 'sponsor'), 99, a), 1)
  const done = complete()
  const pages = pagesFor(done, 'sponsor')
  assert.equal(pageIndex(pages, 99, done), pages.length - 1)
  delete done.S.S1
  assert.equal(pageIndex(pages, 99, done), pages.indexOf('dilemma'))
  assert.equal(pageReady('confirm', done), false)
  for (const saved of [-1, NaN, Infinity, 1.5]) assert.equal(pageIndex(pages, saved, done), 0)
})

test('invalid questionnaire options never generate NaN weights', () => {
  for (const value of [0, 6, NaN, Infinity, 2.5]) {
    const a = complete()
    a.orient.O1 = value
    assert.equal(weightInput(a), null)
    assert.equal(pageReady('orient', a), false)
  }
  const a = complete()
  a.S.S1 = 0
  assert.equal(weightInput(a), null)
  assert.equal(pageReady('dilemma', a), false)
})
