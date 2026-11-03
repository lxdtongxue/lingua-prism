import { useI18n } from '../components/i18n'
import { Radar as RadarIcon, Route, Wrench } from 'lucide-react'
import { Card } from '../components/Card'
import { openDetail } from '../components/Details'
import { SectionHead } from '../components/SectionHead'
import { useReveal } from '../components/useReveal'

const C = 200
const R = 138
const AXES = 3
const pt = (i: number, v: number) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / AXES
  return [C + Math.cos(a) * R * v, C + Math.sin(a) * R * v]
}

export function Radar({ focus, bare }: { focus: number; bare?: boolean }) {
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
          return <line key={a.id} className={`radar__axis${focus === i ? ' on' : ''}`} x1={C} y1={C} x2={x} y2={y} />
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

export function Aptitude() {
  const { t } = useI18n()
  const a = t.aptitude
  const c = a.cards

  return (
    <section id="aptitude" className="section">
      <div className="wrap">
        <SectionHead kicker={a.kicker} title={a.title} intro={a.intro} />
        <div className="bento">
          <Card icon={RadarIcon} title={c.profile[0]} desc={c.profile[1]} className="bento__wide" onOpen={() => openDetail('profile')}>
            <span className="bento__radar" aria-hidden="true">
              <Radar focus={-1} bare />
            </span>
          </Card>
          <Card icon={Wrench} title={c.tools[0]} desc={c.tools[1]} delay={80} onOpen={() => openDetail('tools')} />
          <Card icon={Route} title={c.path[0]} desc={c.path[1]} delay={160} onOpen={() => openDetail('path')} />
        </div>
      </div>
    </section>
  )
}
