import { weightInput, type Answers, type Tier } from './score.ts'

export type Page = 'start' | 'orient' | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'r1' | 'p1' | 'p2' | 'accept' | 'dilemma' | 'confirm'

export function pagesFor(a: Answers, tier: Tier): Page[] {
  if (tier === 'basic') return ['start', 'g1', 'g2', 'r1', 'p1', 'accept']
  const detail: Page[] = [...((a.goals.job ?? 0) >= 2 ? (['g3'] as const) : []), ...((a.goals.study ?? 0) >= 2 ? (['g4'] as const) : []), ...((a.goals.travel ?? 0) >= 2 ? (['g5'] as const) : []), ...((a.goals.academic ?? 0) >= 2 ? (['g6'] as const) : [])]
  return ['start', 'orient', 'g1', 'g2', ...detail, 'r1', 'p1', 'p2', 'accept', 'dilemma', 'confirm']
}

export function pageReady(page: Page, a: Answers): boolean {
  if (page === 'orient') return Array.from({ length: 13 }, (_, i) => a.orient[`O${i}`]).every(v => Number.isInteger(v) && v >= 1 && v <= 5)
  if (page === 'g1') return ['job', 'study', 'travel', 'academic', 'none'].includes(a.g1 ?? '')
  if (page === 'dilemma') return [a.S.S1, a.S.S2, a.S.S3].every(v => [3, 1, -1, -3].includes(v as number))
  if (page === 'confirm') return pageReady('orient', a) && pageReady('g1', a) && weightInput(a) !== null
  return true
}

// Older/synchronised progress may refer to a different mode or a longer branch.
// Never restore beyond a required page whose answers are still missing.
export function pageIndex(pages: Page[], saved: number, a: Answers) {
  const next = Number.isInteger(saved) && saved >= 0 ? Math.min(saved, pages.length - 1) : 0
  const missing = pages.slice(0, next).findIndex(page => !pageReady(page, a))
  return missing < 0 ? next : missing
}
