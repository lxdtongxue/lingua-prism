import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GRAMMAR_MAX, GRAMMAR_MIN, grammarSimilarity, scoreT, similarity } from './similarity.ts'

test('similarity is 100 minus LDND, floored at 0', () => {
  assert.equal(similarity('en', 'de')?.toFixed(2), '32.67')
  assert.equal(similarity('zh', 'en'), 0)
  assert.equal(similarity('de', 'en'), similarity('en', 'de'))
  assert.equal(similarity('zh', 'zh'), null)
  assert.equal(similarity('zh', 'xx'), null)
})

test('grammar similarity is scaled to the matrix range', () => {
  assert.equal(GRAMMAR_MIN, 52.33)
  assert.equal(GRAMMAR_MAX, 93.72)
  assert.equal(grammarSimilarity('it', 'pt'), 100)
  assert.equal(grammarSimilarity('zh', 'ar'), 0)
  assert.equal(grammarSimilarity('en', 'de'), grammarSimilarity('de', 'en'))
  assert.equal(grammarSimilarity('en', 'en'), null)
})

test('T averages vocabulary and grammar, each from the closest known language', () => {
  const t = scoreT('de', ['zh', 'en'])!
  assert.equal(t.nearest, 'en')
  assert.equal(t.grammarNearest, 'en')
  assert.equal(t.lexical.toFixed(2), '32.67')
  assert.equal(t.grammar.toFixed(2), '62.77')
  assert.equal(t.value.toFixed(2), '47.72')
  const th = scoreT('th', ['zh', 'en'])!
  assert.equal(th.grammarNearest, 'zh')
  assert.equal(th.nearest, 'en')
  assert.equal(scoreT('de', []), null)
})
