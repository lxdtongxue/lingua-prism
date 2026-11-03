import assert from 'node:assert/strict'
import { test } from 'node:test'
import { centerPath, pagePath, readSection, recoverLegacyPath } from './paths.ts'

test('test exits resolve to the explicit center page on both deployment paths', () => {
  for (const base of ['/', '/lingua-prism/']) {
    for (const section of ['test', 'lab'] as const) {
      const target = new URL(centerPath(base, section), `https://example.com${base}test/?sub=VL`)
      assert.equal(target.pathname, `${base}center/index.html`)
      assert.equal(target.hash, '')
      assert.equal(target.searchParams.get('section'), section)
    }
  }
})

test('all navigation targets avoid fragments on root and subdirectory deployments', () => {
  for (const base of ['/', '/lingua-prism/']) {
    for (const section of ['hero', 'framework', 'spectrum', 'aptitude', 'roadmap', 'references', 'test', 'lab']) {
      const site = section === 'test' || section === 'lab' ? 'center' : 'home'
      const path = pagePath(base, site, section)
      assert.equal(path.includes('#'), false)
      const url = new URL(path, 'https://example.com')
      assert.equal(readSection(url.search, url.hash), section === 'hero' ? undefined : section)
    }
  }
})

test('old fragments still work, and a valid query takes precedence', () => {
  assert.equal(readSection('', '#lab'), 'lab')
  assert.equal(readSection('?section=framework', '#lab'), 'framework')
  assert.equal(readSection('?section=invalid', '#test'), 'test')
  assert.equal(readSection('?section=invalid', '#missing'), undefined)
})

test('encoded fragments from the server error log recover to known local routes', () => {
  for (const base of ['/', '/lingua-prism/']) {
    for (const path of ['center/%23test', 'center/index.html%23test', 'center/index.html%2523test']) {
      assert.equal(recoverLegacyPath(base + path, base), centerPath(base))
    }
    assert.equal(recoverLegacyPath(base + '%23framework', base), pagePath(base, 'home', 'framework'))
    assert.equal(recoverLegacyPath(base + '%23lab', base), centerPath(base, 'lab'))
    assert.equal(recoverLegacyPath(base + 'center/index.html#lab', base), centerPath(base, 'lab'))
    for (const path of ['missing%23test', 'center/%23missing', 'center/%ZZ', 'center/%23lab?redirect=https://example.org']) {
      assert.equal(recoverLegacyPath(base + path, base), undefined)
    }
    assert.equal(recoverLegacyPath('//other.example/%23test', base), undefined)
  }
})
