import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scoreT, similarity } from './similarity.ts'

test('similarity is 100 minus LDND, floored at 0', () => {
  assert.equal(similarity('en', 'de')?.toFixed(2), '32.67')
  assert.equal(similarity('zh', 'en'), 0)
  assert.equal(similarity('de', 'en'), similarity('en', 'de'))
  assert.equal(similarity('zh', 'zh'), null)
  assert.equal(similarity('zh', 'xx'), null)
})

test('T uses the closest known language', () => {
  const t = scoreT('de', ['zh', 'en'])
  assert.equal(t?.nearest, 'en')
  assert.equal(t?.value.toFixed(2), '32.67')
  assert.equal(scoreT('de', []), null)
})
