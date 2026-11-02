import assert from 'node:assert/strict'
import { test } from 'node:test'
import cases from './cases.json' with { type: 'json' }
import demands from '../data/language_demands.json' with { type: 'json' }
import { scoreA } from '../a/score.ts'
import { autoWeights, checks, COUNTRIES, countryMatch, emptyAnswers, fixedWeights, LANGS, pct, questionnaireWeights, REGIONS, report, scaleGroup, score, scoreG, scoreGDetail, scoreP, scoreR, scoreRDetail, scoresFor, shifted, subgoalsOf, topRegion, type Answers, type UserDecision, type UserDetail } from './score.ts'

const byId = new Map(LANGS.map((l) => [l.id, l]))
const close = (a: number | null, want: number, at: string) => assert.ok(a !== null && Math.abs(a - want) <= 0.0501, `${at}: got ${a}, want ${want}`)
const all = (v: number) => Object.fromEntries(REGIONS.map((r) => [r, v]))

const jia: UserDecision = { goals: { job: 3, study: 1, travel: 2, academic: 0 }, mode: 'both', regionInterest: { ...all(3), 东亚: 5 }, accept: { VL: 4, SD: 3 } }
const yi: UserDecision = { goals: { job: 0, study: 3, travel: 0, academic: 3 }, mode: 'online', regionInterest: { ...all(2), 西欧: 5, 中东欧: 4 }, accept: { VL: 2, SD: 2 } }
const blank: UserDecision = { goals: { job: 0, study: 0, travel: 0, academic: 0 }, mode: 'both', regionInterest: {}, accept: {} }
const ding: UserDetail = {
  goals: { job: 3, study: 3, travel: 0, academic: 2 },
  mode: 'both',
  regionInterest: {},
  langInterest: { ...Object.fromEntries(LANGS.map((l) => [l.id, 3])), de: 5, fr: 4, ja: 4 },
  accept: { VL: 2, SD: 3, LA: 4 },
  subgoals: { job_engineering: 3, job_trade: 1, study: 3, acad_stem: 2 },
  countries: { study: ['德国', '瑞士', '奥地利'] },
}

test('section 7, user 甲: all 25 languages', () => {
  assert.equal(Object.keys(cases.jia).length, 25)
  for (const [id, [g, r, p]] of Object.entries(cases.jia)) {
    const l = byId.get(id)!
    close(scoreG(l, jia), g, `${id} G`)
    close(scoreR(l, jia), r, `${id} R`)
    close(scoreP(l, jia), p, `${id} P`)
  }
})

test('section 7, user 乙: top five', () => {
  for (const [id, [g, r, p]] of Object.entries(cases.yi)) {
    const l = byId.get(id)!
    close(scoreG(l, yi), g, `${id} G`)
    close(scoreR(l, yi), r, `${id} R`)
    close(scoreP(l, yi), p, `${id} P`)
  }
})

test('section 7, user 丙: nothing filled in', () => {
  for (const l of LANGS) {
    assert.equal(scoreG(l, blank), null)
    assert.equal(scoreP(l, blank), null)
  }
  close(scoreR(byId.get('en')!, blank), 100, 'en')
  close(scoreR(byId.get('tl')!, blank), 8.3, 'tl')
})

test('section 7, user 丁: sponsor tier', () => {
  for (const [id, [g, r, p]] of Object.entries(cases.ding)) {
    const l = byId.get(id)!
    close(scoreGDetail(l, ding), g, `${id} G`)
    close(scoreRDetail(l, ding), r, `${id} R`)
    close(scoreP(l, ding), p, `${id} P`)
  }
  const picked = ding.countries.study!
  assert.equal(countryMatch(byId.get('de')!, picked), 100)
  close(countryMatch(byId.get('fr')!, picked), 33.3, 'fr')
  close(countryMatch(byId.get('it')!, picked), 33.3, 'it')
})

test('section 2.5: properties', () => {
  for (const l of LANGS) for (const v of [scoreG(l, jia), scoreR(l, jia), scoreP(l, jia)]) assert.ok(v !== null && v >= 0 && v <= 100)
  const one = { ...jia, goals: { job: 0, study: 2, travel: 0, academic: 0 } }
  for (const l of LANGS) assert.equal(scoreG(l, one), score(l.g.study))
  const flat = new Set(LANGS.map((l) => scoreP(l, { ...jia, regionInterest: all(4), accept: { VL: 3, SD: 3 } })))
  assert.equal(flat.size, 1)
  const reluctant = { ...blank, accept: { VL: 1 } }
  assert.equal(scoreP(byId.get('de')!, reluctant), 100)
  assert.equal(scoreP(byId.get('ja')!, reluctant), 0)
})

test('section 4.1: weight cases', () => {
  assert.equal(cases.weights.length, 4)
  for (const c of cases.weights) {
    const r = questionnaireWeights(c)
    close(r.G, c.w[0], 'w_G')
    close(r.R, c.w[1], 'w_R')
    close(r.P, c.w[2], 'w_P')
    assert.ok(Math.abs(r.CR - c.CR) <= 0.0006, `CR ${r.CR} vs ${c.CR}`)
    assert.equal(r.cyclic, c.cyclic)
  }
})

test('auto weights total 60, and a missing score gives its share back', () => {
  const w = autoWeights({ G: 30, R: 20, P: 10 }, [])
  assert.equal(w.G + w.R + w.P, 60)
  const m = autoWeights({ G: 30, R: 20, P: 10 }, ['P'])
  assert.equal(m.P, 0)
  assert.equal(m.G, 36)
  assert.equal(m.R, 24)
})

test('A is the same in both tiers', () => {
  assert.deepEqual(fixedWeights(true), { T: 20, A: 20 })
  assert.deepEqual(fixedWeights(false), { T: 20, A: 0 })
  const p = { LA: 80, SD: 40, VL: 60 }
  const a = { ...emptyAnswers(), goals: { job: 3, study: 0, travel: 0, academic: 0 } }
  const before = demands.map((d) => scoreA(d, p))
  for (const tier of ['basic', 'sponsor'] as const) for (const l of LANGS) assert.deepEqual(Object.keys(scoresFor(l, a, tier)).sort(), ['G', 'P', 'R'])
  assert.deepEqual(demands.map((d) => scoreA(d, p)), before)
})

test('decision data stays in step with the A demands', () => {
  assert.equal(LANGS.length, 25)
  for (const l of LANGS) assert.ok(REGIONS.includes(l.region), l.region)
  for (const d of demands) {
    const l = byId.get(d.id)!
    assert.deepEqual([l.D_LA, l.D_SD, l.D_VL], [d.D_LA, d.D_SD, d.D_VL], d.id)
  }
  for (const list of Object.values(COUNTRIES)) for (const id of list) assert.ok(byId.has(id), id)
})

test('section 1.2: a split goal keeps its full weight', () => {
  assert.deepEqual(scaleGroup(3, ['a', 'b'] as const, { a: 2, b: 1 }), { a: 3, b: 1.5 })
  assert.equal(scaleGroup(1, ['a'] as const, { a: 3 }), null)
  assert.equal(scaleGroup(3, ['a'] as const, {}), null)
  const a: Answers = { ...emptyAnswers(), goals: { job: 3, study: 2, travel: 1, academic: 0 }, sub: { job_trade: 1, job_tech: 2 } }
  assert.deepEqual(subgoalsOf(a), { job_trade: 1.5, job_translation: 0, job_tech: 3, job_engineering: 0, job_tourism: 0, job_education: 0, study: 2, travel: 1, academic: 0 })
})

test('sponsor R: percentile only for approved, complete columns', () => {
  const low = { ...LANGS[0], r_raw: { ...LANGS[0].r_raw, coverage: 1 } }
  assert.equal(pct(low, 'coverage', [low, { ...LANGS[1], r_raw: { ...LANGS[1].r_raw, coverage: 2 } }]), 25)
  for (const l of LANGS) assert.equal(scoreRDetail(l, { mode: 'both' }), scoreR(l, { mode: 'both' }))
  assert.notEqual(scoreRDetail(byId.get('de')!, { mode: 'both' }, ['coverage']), 100)
})

test('section 1.7: consistency checks', () => {
  const base: Answers = {
    ...emptyAnswers(),
    orient: { O0: 4, O1: 5, O4: 5, O7: 4, O10: 1, O2: 3, O5: 3, O8: 3, O11: 3, O3: 2, O6: 3, O9: 2, O12: 4 },
    g1: 'job',
    goals: { job: 3, study: 1, travel: 0, academic: 0 },
    regionInterest: { 东亚: 5 },
    S: { S1: 3, S2: 1, S3: 1 },
  }
  const ids = (a: Answers) => checks(a).map((h) => h.id)
  assert.deepEqual(ids(base), [])
  assert.deepEqual(ids({ ...base, orient: { ...base.orient, O0: 2 } }), ['K1'])
  const same = Object.fromEntries(Object.keys(base.orient).map((k) => [k, 3]))
  assert.ok(ids({ ...base, orient: { ...same, O0: 4 } }).includes('K2'))
  const k3 = checks({ ...base, goals: { job: 1, study: 3, travel: 0, academic: 0 } })
  assert.deepEqual(k3.find((h) => h.id === 'K3'), { id: 'K3', other: 'study' })
  assert.ok(ids({ ...base, goals: { job: 1, study: 1, travel: 0, academic: 0 } }).includes('K4'))
  const keen = { ...base, orient: { ...base.orient, O3: 5, O6: 5, O9: 4, O12: 2 }, regionInterest: { 东亚: 3 } }
  assert.ok(ids(keen).includes('K5'))
  assert.ok(ids({ ...base, S: { S1: -1, S2: 1, S3: 1 } }).includes('K6'))
  assert.ok(ids({ ...base, S: { S1: -3, S2: -3, S3: -3 } }).includes('K7'))
})

test('section 1.5: the top rated language picks the region', () => {
  const a = { ...emptyAnswers(), regionInterest: { 东亚: 3, 西欧: 2 }, langInterest: { de: 5 } }
  assert.equal(topRegion(a), '西欧')
})

test('section 6: report and sensitivity', () => {
  const w = { T: 20, A: 20, G: 30, R: 20, P: 10 }
  const s = shifted(w, 'P')
  assert.equal(s.P, 20)
  assert.ok(Math.abs(s.G + s.R + s.P - 60) < 1e-9)
  assert.deepEqual([s.T, s.A], [20, 20])
  const rows = [
    { id: 'a', values: { T: 50, A: 50, G: 90, R: 50, P: 10 } },
    { id: 'b', values: { T: 50, A: 50, G: 60, R: 50, P: 90 } },
  ]
  const r = report(rows, w)
  assert.equal(r[0].id, 'a')
  assert.equal(r[0].top[0], 'G')
  assert.equal(r[0].weak, 'P')
  assert.deepEqual(r[0].flips, [{ dim: 'P', id: 'b' }])
})
