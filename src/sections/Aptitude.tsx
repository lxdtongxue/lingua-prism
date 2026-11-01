import { useMemo, useState } from 'react'
import { useI18n } from '../components/i18n'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { useReveal } from '../components/useReveal'
import { STUDIES } from '../content/content'

const C = 200
const R = 138
const pt = (i: number, v: number) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
  return [C + Math.cos(a) * R * v, C + Math.sin(a) * R * v]
}

function Radar({ focus }: { focus: number }) {
  const { t } = useI18n()
  const items = t.aptitude.abilities
  const ref = useReveal<HTMLDivElement>()
  const shape = items.map((a, i) => pt(i, a.v).join(',')).join(' ')
  return (
    <div className="radar" ref={ref}>
      <svg viewBox="0 0 400 400" role="img" aria-label={t.aptitude.radarNote}>
        <defs>
          <radialGradient id="rf" cx="50%" cy="50%" r="60%">
            <stop offset="0" stopColor="#a58bff" stopOpacity=".55" />
            <stop offset="1" stopColor="#4cc4ff" stopOpacity=".12" />
          </radialGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} className="radar__ring" points={items.map((_, i) => pt(i, r).join(',')).join(' ')} />
        ))}
        {items.map((a, i) => {
          const [x, y] = pt(i, 1)
          return <line key={a.id} className={`radar__axis${a.core ? '' : ' ext'}${focus === i ? ' on' : ''}`} x1={C} y1={C} x2={x} y2={y} />
        })}
        <g className="radar__shape">
          <polygon points={shape} fill="url(#rf)" stroke="#d6ddff" strokeWidth="1.4" strokeLinejoin="round" />
          {items.map((a, i) => {
            const [x, y] = pt(i, a.v)
            return <circle key={a.id} cx={x} cy={y} r={focus === i ? 6 : 3.6} className={focus === i ? 'on' : ''} />
          })}
        </g>
        {items.map((a, i) => {
          const [x, y] = pt(i, 1.17)
          return (
            <text key={a.id} x={x} y={y + 4} textAnchor="middle" className={focus === i ? 'on' : ''}>
              {a.id}
            </text>
          )
        })}
      </svg>
      <p className="note">{t.aptitude.radarNote}</p>
    </div>
  )
}

export function Aptitude() {
  const { t } = useI18n()
  const a = t.aptitude
  const [focus, setFocus] = useState(-1)
  const [filter, setFilter] = useState('all')
  const list = useMemo(() => STUDIES.filter((s) => filter === 'all' || s.g.includes(filter as 'p')), [filter])
  const a2Head = useReveal<HTMLDivElement>()

  return (
    <section id="aptitude" className="section">
      <div className="wrap">
        <SectionHead kicker={a.kicker} title={a.title} intro={a.intro} />

        <div className="apt">
          <Glass className="apt__chart" radius={38} bevel={15} frost={0.74} dim={0.42}>
            <Radar focus={focus} />
          </Glass>
          <Glass className="apt__list" radius={38} bevel={15} frost={0.74} dim={0.42} delay={90}>
            <ul>
              {a.abilities.map((b, i) => (
                <li
                  key={b.id}
                  tabIndex={0}
                  className={focus === i ? 'on' : ''}
                  onPointerEnter={() => setFocus(i)}
                  onPointerLeave={() => setFocus(-1)}
                  onFocus={() => setFocus(i)}
                  onBlur={() => setFocus(-1)}
                >
                  <span className="abbr">{b.id}</span>
                  <div>
                    <h4>
                      {b.name}
                      <em className={b.core ? 'tag tag--core' : 'tag'}>{b.core ? a.core : a.ext}</em>
                    </h4>
                    <p>{b.def}</p>
                    <small>
                      {a.subtestLabel} · {b.sub}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          </Glass>
        </div>

        <h3 className="sub rise-self">{a.toolsTitle}</h3>
        <div className="tools">
          {a.tools.map((b, i) => (
            <Glass as="article" className="tool" radius={30} bevel={13} frost={0.74} dim={0.42} delay={i * 90} key={b.name}>
              <header>
                <strong>{b.name}</strong>
                <em className="tag">{b.tag}</em>
              </header>
              <p>{b.text}</p>
            </Glass>
          ))}
        </div>

        <div className="a2-head rise" ref={a2Head}>
          <h2>{a.a2Title}</h2>
          <p className="lead">{a.a2Intro}</p>
        </div>

        <ol className="chain">
          {a.chain.map((c, i) => (
            <Glass as="li" className="chain__node" radius={28} bevel={13} frost={0.74} dim={0.42} delay={i * 90} key={c.k}>
              <span className="micro">{c.en}</span>
              <h4>{c.k}</h4>
              <p>{c.d}</p>
            </Glass>
          ))}
        </ol>

        <div className="layers">
          {a.layers.map((l, i) => (
            <Glass className="layer" radius={26} bevel={12} frost={0.74} dim={0.42} delay={i * 80} key={l.k}>
              <h4>{l.k}</h4>
              <ul>
                {l.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Glass>
          ))}
          <Glass className="layer layer--out" radius={26} bevel={12} frost={0.74} dim={0.42} delay={240}>
            <h4>{a.outcomesLabel}</h4>
            <ul>
              {a.outcomes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Glass>
        </div>

        <Glass className="evidence" radius={38} bevel={15} frost={0.74} dim={0.42}>
          <div className="evidence__head">
            <div>
              <h3>{a.evidenceTitle}</h3>
              <p>{a.evidenceIntro}</p>
            </div>
            <div className="chips" role="group" aria-label={a.evidenceTitle}>
              {a.filters.map((f) => (
                <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="studies">
            {list.map((s) => (
              <li key={s.id}>
                <span className="abbr">{s.id}</span>
                <div>
                  <strong>{s.cite}</strong>
                  <span>{s.title}</span>
                </div>
              </li>
            ))}
          </ul>
        </Glass>
      </div>
    </section>
  )
}
