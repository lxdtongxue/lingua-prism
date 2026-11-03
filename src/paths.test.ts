import assert from 'node:assert/strict'
import { test } from 'node:test'
import { centerPath } from './paths.ts'

test('test exits resolve to the explicit center page on both deployment paths', () => {
  for (const base of ['/', '/lingua-prism/']) {
    for (const section of ['test', 'lab'] as const) {
      const target = new URL(centerPath(base, section), `https://example.com${base}test/?sub=VL`)
      assert.equal(target.pathname, `${base}center/index.html`)
      assert.equal(target.hash, `#${section}`)
      assert.equal(target.search, '')
    }
  }
})
