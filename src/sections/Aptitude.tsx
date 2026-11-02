import { useState } from 'react'
import { useI18n } from '../components/i18n'
import { BookMarked, Radar as RadarIcon, Route, Wrench } from 'lucide-react'
import { Card } from '../components/Card'
import { Sheet } from '../components/Sheet'
import { SectionHead } from '../components/SectionHead'
import { useReveal } from '../components/useReveal'
import { Evidence } from '../components/Evidence'

const C = 200
const R = 138
const pt = (i: number, v: number) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
  return [C + Math.cos(a) * R * v, C + Math.sin(a) * R * v]
}

function Radar({ focus, bare }: { focus: number; bare?: boolean }) {
  const { t } = useI18n()
  const items = t.aptitude.abilities
  const ref = useReveal<HTMLDivElement>()
  const shape = items.map((a, i) => pt(i, a.v).join(',')).join(' ')
  return (
    <div className="radar" ref={ref}>
      <svg viewBox="0 0 400 400" role="img" aria-label={t.aptitude.radarNote}>
        <defs>
          <radialGradient id={bare ? 'rf-bare' : 'rf'} cx="50%" cy="50%" r="60%">
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
          <polygon points={shape} fill={`url(#${bare ? 'rf-bare' : 'rf'})`} stroke="#d6ddff" strokeWidth="1.4" strokeLinejoin="round" />
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
      {!bare && <p className="note">{t.aptitude.radarNote}</p>}
    </div>
  )
}

type View = 'profile' | 'tools' | 'path' | 'studies'

export function Aptitude() {
  const { t } = useI18n()
  const a = t.aptitude
  const [focus, setFocus] = useState(-1)
  const [open, setOpen] = useState<View | null>(null)
  const close = () => setOpen(null)
  const c = a.cards

  return (
    <section id="aptitude" className="section">
      <div className="wrap">
        <SectionHead kicker={a.kicker} title={a.title} intro={a.intro} />
        <div className="bento">
          <Card icon={RadarIcon} title={c.profile[0]} desc={c.profile[1]} className="bento__wide" onOpen={() => setOpen('profile')}>
            <span className="bento__radar" aria-hidden="true">
              <Radar focus={-1} bare />
            </span>
          </Card>
          <Card icon={Wrench} title={c.tools[0]} desc={c.tools[1]} delay={80} onOpen={() => setOpen('tools')} />
          <Card icon={Route} title={c.path[0]} desc={c.path[1]} delay={160} onOpen={() => setOpen('path')} />
          <Card icon={BookMarked} title={c.studies[0]} desc={c.studies[1]} delay={240} onOpen={() => setOpen('studies')}>
            <span className="bento__num">14</span>
          </Card>
        </div>
      </div>

      <Sheet open={open === 'profile'} onClose={close} kicker={a.kicker} title={c.profile[0]}>
        <div className="sheet__radar">
          <Radar focus={focus} />
        </div>
        <ul className="abilities">
          {a.abilities.map((b, i) => (
            <li key={b.id} tabIndex={0} className={focus === i ? 'on' : ''} onPointerEnter={() => setFocus(i)} onPointerLeave={() => setFocus(-1)} onFocus={() => setFocus(i)} onBlur={() => setFocus(-1)}>
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
      </Sheet>

      <Sheet open={open === 'tools'} onClose={close} kicker={a.kicker} title={a.toolsTitle}>
        <div className="tools">
          {a.tools.map((b) => (
            <article className="tool" key={b.name}>
              <header>
                <strong>{b.name}</strong>
                <em className="tag">{b.tag}</em>
              </header>
              <p>{b.text}</p>
            </article>
          ))}
        </div>
      </Sheet>

      <Sheet open={open === 'path'} onClose={close} kicker={a.kicker} title={a.a2Title}>
        <p className="sheet__lead">{a.a2Intro}</p>
        <ol className="chain">
          {a.chain.map((n) => (
            <li className="chain__node" key={n.k}>
              <span className="micro">{n.en}</span>
              <h4>{n.k}</h4>
              <p>{n.d}</p>
            </li>
          ))}
        </ol>
        <div className="layers">
          {a.layers.map((l) => (
            <div className="layer" key={l.k}>
              <h4>{l.k}</h4>
              <ul>
                {l.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="layer layer--out">
            <h4>{a.outcomesLabel}</h4>
            <ul>
              {a.outcomes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </Sheet>

      <Sheet open={open === 'studies'} onClose={close} kicker={a.kicker} title={a.evidenceTitle} fill>
        <Evidence />
      </Sheet>
    </section>
  )
}
