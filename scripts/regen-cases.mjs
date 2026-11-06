/** 重新生成 a/cases.json 与 decision/cases.json 的期望值。
 *  画像定义与 src/decision/score.test.ts 保持一致（不要导入测试文件，它有副作用）。 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import * as A from '../src/a/score.ts'
import * as D from '../src/decision/score.ts'

const __dir = dirname(fileURLToPath(import.meta.url))
const P = (f) => resolve(__dir, '..', f)
const demands = JSON.parse(readFileSync(P('src/data/language_demands.json'), 'utf-8'))
const byIdA = new Map(demands.map((l) => [l.id, l]))
// 决策数据来自 decision_data.json（score.ts 的 LANGS），不是 language_demands
const byId = new Map(D.LANGS.map((l) => [l.id, l]))

// --- A: 四个能力画像（同 a/score.test.ts 的 USERS）---
const USERS = [
  { LA: 85, SD: 50, VL: 50 },
  { LA: 50, SD: 85, VL: 50 },
  { LA: 50, SD: 50, VL: 85 },
  { LA: 70, SD: 70, VL: 70 },
]
const aCases = JSON.parse(readFileSync(P('src/a/cases.json'), 'utf-8'))
for (const [id, arr] of Object.entries(aCases)) {
  const l = byIdA.get(id)
  USERS.forEach((u, i) => {
    const v = A.scoreA(l, u)
    arr[i] = v == null ? null : +v.toFixed(4)
  })
}
writeFileSync(P('src/a/cases.json'), JSON.stringify(aCases, null, 2) + '\n')
console.log('a/cases.json ✅  pl:', JSON.stringify(aCases.pl))

// --- decision: 甲/乙/丁（同 decision/score.test.ts）---
const REGIONS = ['英语世界','东亚','西欧','南欧与拉美','俄语区与中亚','西亚与北非','东南亚','南亚','中东欧']
const all = (v) => Object.fromEntries(REGIONS.map((r) => [r, v]))

const jia = { goals: { job: 3, study: 1, travel: 2, academic: 0 }, mode: 'both', regionInterest: { ...all(3), 东亚: 5 }, accept: { VL: 4, SD: 3 } }
const yi = { goals: { job: 0, study: 3, travel: 0, academic: 3 }, mode: 'online', regionInterest: { ...all(2), 西欧: 5, 中东欧: 4 }, accept: { VL: 2, SD: 2 } }
const ding = {
  goals: { job: 3, study: 3, travel: 0, academic: 2 },
  mode: 'both',
  regionInterest: {},
  langInterest: { ...Object.fromEntries(D.LANGS.map((l) => [l.id, 3])), de: 5, fr: 4, ja: 4 },
  accept: { VL: 2, SD: 3, LA: 4 },
  subgoals: { job_engineering: 3, job_trade: 1, study: 3, acad_stem: 2 },
  countries: { study: ['德国', '瑞士', '奥地利'] },
}

const dCases = JSON.parse(readFileSync(P('src/decision/cases.json'), 'utf-8'))
const r2 = (v) => (v == null ? null : +v.toFixed(4))
for (const [name, u, detail] of [['jia', jia, false], ['yi', yi, false], ['ding', ding, true]]) {
  for (const id of Object.keys(dCases[name])) {
    const l = byId.get(id)
    const g = detail ? D.scoreGDetail(l, u) : D.scoreG(l, u)
    const r = detail ? D.scoreRDetail(l, u) : D.scoreR(l, u)
    const p = D.scoreP(l, u)
    dCases[name][id] = [r2(g), r2(r), r2(p)]
  }
}
writeFileSync(P('src/decision/cases.json'), JSON.stringify(dCases, null, 2) + '\n')
console.log('decision/cases.json ✅')
