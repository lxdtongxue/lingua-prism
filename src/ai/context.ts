import { useMemo } from 'react'
import demands from '../data/language_demands.json'
import { scoreT } from '../a/similarity'
import { scoreA, weightedScore, type Lang as Demand } from '../a/score'
import { useTall } from '../components/tall'
import { useKnownLanguages } from '../components/languages'
import { useDecision } from '../components/decision'
import { configuredWeights, LANGS, scoresFor, weightInput, questionnaireWeights } from '../decision/score'
import { NATIVE_NAMES } from '../content/content'

/**
 * 给智能体/工作流用的「真实上下文」。
 *
 * 重要：语棱的五维不是全局值，而是**逐语言**的——
 * 同一个用户对法语和德语的 T/G/R/P 都不一样。
 * 所以这里取的是「当前排名第一的候选语言」的五维值，
 * 并把用户背景一并带出去，让模型有足够条件给个性化建议。
 *
 * 没做测验/问卷时返回 isDemo = true，UI 必须标注「示例数据」。
 */
export type AiProfile = {
  known_languages: string[]
  comparing: string[]
  goal: string
  goal_detail: string
  weekly_hours: number | null
  resource_mode: string
  lang_prefs: Record<string, string>
}

export type AiContext = {
  language: string
  languageEn: string
  scores: Record<'T' | 'A' | 'G' | 'R' | 'P', number>
  weights: Record<'T' | 'A' | 'G' | 'R' | 'P', number>
  profile: AiProfile
  isDemo: boolean
  /** 只有真实数据才可用，UI 用来显示「示例数据」标记 */
  demoReason: string
}

/** 没有任何测评数据时的兜底示例 —— 必须在 UI 上明确标注 */
export const DEMO_CONTEXT: AiContext = {
  language: '法语',
  languageEn: 'French',
  scores: { T: 62, A: 71, G: 80, R: 55, P: 68 },
  weights: { T: 0.3, A: 0.3, G: 0.2, R: 0.1, P: 0.1 },
  profile: {
    known_languages: ['中文', '英语'],
    comparing: [],
    goal: '',
    goal_detail: '',
    weekly_hours: null,
    resource_mode: '',
    lang_prefs: {},
  },
  isDemo: true,
  demoReason: '尚未完成测评或问卷',
}

const GOAL_ZH: Record<string, string> = {
  job: '就业',
  study: '留学',
  travel: '旅行',
  academic: '学术研究',
}
const GOAL_EN: Record<string, string> = {
  job: 'work',
  study: 'study abroad',
  travel: 'travel',
  academic: 'academic research',
}
const MODE_ZH: Record<string, string> = {
  offline: '能上线下课',
  online: '只能线上自学',
  both: '线上线下都可以',
}

function topGoal(goals: Record<string, number>, en: boolean) {
  const arr = Object.entries(goals || {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
  const [k, v] = arr[0] ?? ['', 0]
  if (!k || !v) return { name: '', detail: '' }
  return { name: (en ? GOAL_EN : GOAL_ZH)[k] ?? k, detail: (en ? GOAL_EN : GOAL_ZH)[k] ?? k }
}

/** 在组件里调用；不会抛错，最差返回 DEMO_CONTEXT */
export function useAiContext(en = false): AiContext {
  const { percentiles, count } = useTall()
  const known = useKnownLanguages()
  const { answers, tier, sliders, anchors } = useDecision()

  return useMemo<AiContext>(() => {
    try {
      const have = new Set([...(known.l1 || []), ...(known.l2 || [])])
      const pool = (demands as { id: string; zh: string; en: string }[]).filter((d) => !have.has(d.id))
      if (!pool.length) return DEMO_CONTEXT

      const scored = pool.map((d) => ({
        d,
        s: scoresFor(LANGS.find((x) => x.id === d.id)!, answers, tier),
      }))
      const missing = (['G', 'R', 'P'] as const).filter((k) => scored.length > 0 && scored.every((x) => x.s[k] === null))
      const hasA = count > 0
      const hasT = have.size > 0
      const weightsIn = tier === 'sponsor' && answers.confirmed ? weightInput(answers) : null
      const auto = weightsIn ? questionnaireWeights(weightsIn) : null
      const w = configuredWeights(
        anchors,
        auto ?? sliders,
        [...missing, ...(!hasA ? ['A' as const] : []), ...(!hasT ? ['T' as const] : [])],
      )

      const ranked = scored
        .map(({ d, s }) => {
          const a = scoreA(d as unknown as Demand, percentiles)
          const t = scoreT(d.id, [...have])
          const values = { T: t?.value ?? null, A: a, ...s }
          return {
            d,
            values,
            score: weightedScore(values, w),
          }
        })
        .sort((x, y) => (y.score ?? -1) - (x.score ?? -1))

      const top = ranked[0]
      if (!top) return DEMO_CONTEXT

      const round = (v: number | null) => (v == null ? 0 : Math.round(v))
      const scores = {
        T: round(top.values.T),
        A: round(top.values.A),
        G: round(top.values.G),
        R: round(top.values.R),
        P: round(top.values.P),
      }
      const weights = {
        T: +(w.T / 100).toFixed(3),
        A: +(w.A / 100).toFixed(3),
        G: +(w.G / 100).toFixed(3),
        R: +(w.R / 100).toFixed(3),
        P: +(w.P / 100).toFixed(3),
      }

      // 是否算得上「真实数据」：至少做了测验，或者问卷已确认
      const real = hasA || (tier === 'sponsor' && answers.confirmed)
      const demoReason = real ? '' : hasT ? '尚未完成测验与问卷' : '尚未登记已掌握的语言'

      const goal = topGoal(answers.goals as Record<string, number>, en)
      // 真正的「逐语言偏好」来自 langInterest（每个语言 0-5 分），
      // 不是 accept（那是学新文字/新发音的意愿，属于能力偏好）
      const langPrefs: Record<string, string> = {}
      for (const [id, v] of Object.entries(answers.langInterest || {})) {
        if (typeof v === 'number') langPrefs[NATIVE_NAMES[id] ?? id] = String(v)
      }

      const profile: AiProfile = {
        known_languages: [...known.l1, ...known.l2].map((id) => NATIVE_NAMES[id] ?? id),
        comparing: ranked.slice(0, 5).map((r) => (en ? r.d.en : r.d.zh)),
        goal: goal.name,
        goal_detail: goal.detail,
        weekly_hours: (answers as unknown as { weekly_hours?: number }).weekly_hours ?? null,
        resource_mode: en ? (answers.mode ?? '') : (MODE_ZH[answers.mode ?? 'both'] ?? answers.mode ?? ''),
        lang_prefs: langPrefs,
      }

      return {
        language: en ? top.d.en : top.d.zh,
        languageEn: top.d.en,
        scores,
        weights,
        profile,
        isDemo: !real,
        demoReason,
      }
    } catch {
      return DEMO_CONTEXT
    }
  }, [answers, anchors, count, known, percentiles, sliders, tier, en])
}
