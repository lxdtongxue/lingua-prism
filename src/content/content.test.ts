import assert from 'node:assert/strict'
import { test } from 'node:test'
import { content } from './content.ts'
import { details } from './details.ts'
import { questions } from '../decision/questions.ts'
import { formatVersion, parseReleaseNotes } from './releaseNotes.ts'

test('both languages have matching copy keys, detail pages and navigation targets', () => {
  const keys = (value: unknown, prefix = ''): string[] => value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value).flatMap(([key, item]) => keys(item, `${prefix}.${key}`)).sort()
    : [prefix]
  assert.deepEqual(keys(content.zh), keys(content.en))
  assert.deepEqual(keys(questions.zh), keys(questions.en))
  assert.deepEqual(Object.keys(details.zh), Object.keys(details.en))
  for (const pages of Object.values(details)) for (const page of Object.values(pages)) {
    assert.ok(page.lead.length > 0 && page.blocks.length > 0)
    for (const id of page.more) assert.ok(id in pages)
  }
})

test('current user-facing copy has no experimental or trial labels', () => {
  const copy = JSON.stringify({ content, details, questions })
  assert.doesNotMatch(copy, /实验性|研究版本|内测|样稿|开放试用|experimental|open trial|prototype/i)
  assert.match(copy, /CC BY-NC-SA/)
  assert.match(copy, /不代表学习成功概率/)
  assert.match(copy, /AI 编码/)
  assert.match(copy, /尚未经人工核实/)
})

test('release labels support historical versions and the V8 formal release', () => {
  assert.equal(formatVersion('0.6.7'), 'v6.7')
  assert.equal(formatVersion('7.0.0'), 'v7')
  assert.equal(formatVersion('8.0.0'), 'v8')
  assert.equal(formatVersion('8.1.0'), 'v8.1')
  assert.equal(formatVersion('7.0.1'), 'v7.0.1')
  assert.equal(parseReleaseNotes('### v7（2026-11-04）\n正式版\n\n### v6.7\n历史版本')[0].version, 'v7')
})
