import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GRAMMAR_MAX, GRAMMAR_MIN, grammarSimilarity, pairT, scoreT, similarity } from './similarity.ts'

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

test('T comes from the one known language with the highest pair score', () => {
  const t = scoreT('de', ['zh', 'en'])!
  assert.equal(t.nearest, 'en')
  assert.equal(t.lexical.toFixed(2), '32.67')
  assert.equal(t.grammar.toFixed(2), '62.77')
  assert.equal(t.value.toFixed(2), '47.72')
  const th = scoreT('th', ['zh', 'en'])!
  assert.equal(th.nearest, 'zh')
  assert.equal(th.value.toFixed(2), '38.45')
  assert.equal(th.lexical.toFixed(2), '0.94')
  assert.equal(scoreT('de', []), null)
})

test('the revised plan: results for Chinese plus English', () => {
  const rank = (ids: string[]) => ids.map((id) => [id, scoreT(id, ['zh', 'en'])!.value] as const).sort((a, b) => b[1] - a[1]).map(([id]) => id)
  const all = ['de', 'th', 'ro', 'es', 'it', 'cs', 'fr', 'id', 'ms', 'uk', 'pt', 'el', 'fa', 'ko', 'be', 'ru', 'ja', 'ur', 'kk', 'tl', 'pl', 'hi', 'tr', 'ar']
  assert.deepEqual(rank(all), all)
})

test('one known language gives the same result as its pair', () => {
  assert.deepEqual(scoreT('ja', ['zh']), pairT('ja', 'zh'))
})
