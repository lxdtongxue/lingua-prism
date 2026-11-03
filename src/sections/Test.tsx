import { ArrowRight, BookOpenCheck, ClipboardList, Headphones, Lock, Puzzle, Sparkles, type LucideIcon } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { Card, CLEAR } from '../components/Card'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { goTo } from '../components/pager'
import { clearResults, useTall } from '../components/tall'
import { useDecision } from '../components/decision'
import { ABILITIES, maxScore } from '../a/score'
import { ORDER, type Sub } from '../tall/items'

const ICONS: Record<Sub, LucideIcon> = { VL: BookOpenCheck, SD: Headphones, LA: Puzzle }

export function Profile() {
  const { t } = useI18n()
  const c = t.test
  const { percentiles: p, count } = useTall()
  return (
    <div className="bars">
      {ABILITIES.map((k) => (
        <div className={`pbar${p[k] == null ? ' pbar--empty' : ''}`} key={k}>
          <span>{c.abilities[k]}</span>
          <i>
            <u style={{ transform: `scaleX(${(p[k] ?? 0) / 100})` }} />
          </i>
          <b>{p[k] ?? '—'}</b>
        </div>
      ))}
      <p className="note">{count ? c.profileNote : c.profileEmpty}</p>
    </div>
  )
}

export function Test() {
  const { t } = useI18n()
  const c = t.test
  const { results, count, placeholder } = useTall()
  const { answers } = useDecision()
  const open = (sub: Sub) => location.assign(`${import.meta.env.BASE_URL}test/?sub=${sub}`)
  const next = ORDER.find((s) => !results[s])
  return (
    <section id="test" className="section">
      <div className="wrap">
        <SectionHead kicker={c.kicker} title={c.title} intro={c.intro} />
        <div className="flow">
          {ORDER.map((sub, i) => {
            const r = results[sub]
            const locked = i > 0 && !results[ORDER[i - 1]]
            const s = c.subs[sub]
            return (
              <Card
                key={sub}
                icon={locked ? Lock : ICONS[sub]}
                kicker={`${i + 1} · ${sub}`}
                title={s.name}
                desc={r ? c.done.replace('{s}', String(r.score)).replace('{max}', String(maxScore(sub))) : locked ? c.locked : s.brief}
                className={locked ? 'card--locked' : undefined}
                delay={i * 80}
                onOpen={() => {
                  if (!locked) open(sub)
                }}
              />
            )
          })}
        </div>
        <Glass className="profile" radius={30} {...CLEAR} frost={0.3} dim={0.3} delay={200}>
          <h3>
            {c.profile}
            {placeholder && <em className="tag tag--demo">{c.exam.placeholder}</em>}
          </h3>
          <Profile />
          <div className="profile__row">
            {next && (
              <button type="button" className="sheet__cta" onClick={() => open(next)}>
                {count ? c.resume.replace('{name}', c.subs[next].name) : c.start}
                <ArrowRight size={16} strokeWidth={1.8} />
              </button>
            )}
            {!next && !answers.done && (
              <a className="sheet__cta" href={`${import.meta.env.BASE_URL}survey/`}>
                <ClipboardList size={16} strokeWidth={1.8} />
                {c.exam.surveyGo}
              </a>
            )}
            <button type="button" className={next || !answers.done ? 'sheet__cta sheet__cta--quiet' : 'sheet__cta'} onClick={() => goTo('lab')}>
              <Sparkles size={16} strokeWidth={1.8} />
              {c.toLab}
            </button>
            {count > 0 && (
              <button type="button" className="sheet__link" onClick={clearResults}>
                {c.clear}
              </button>
            )}
          </div>
          <p className="note">{c.privacy}</p>
        </Glass>
      </div>
    </section>
  )
}
