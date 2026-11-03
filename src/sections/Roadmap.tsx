import { Calculator, Network, Ruler, Scale3d } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { Card } from '../components/Card'
import { openDetail } from '../components/Details'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { useReveal } from '../components/useReveal'
import { goTo } from '../components/pager'

const ICONS = [Network, Ruler, Calculator, Scale3d]
const PAGES = ['refine', 'evaluate', 'review', 'assess'] as const

export function Roadmap() {
  const { t } = useI18n()
  const r = t.roadmap
  const end = useReveal<HTMLDivElement>()
  return (
    <section id="roadmap" className="section section--end">
      <div className="wrap">
        <SectionHead kicker={r.kicker} title={r.title} intro={r.goal} />
        <p className="goal-note">{r.progress}</p>
        <div className="steps">
          {r.steps.map((s, i) => (
            <Card
              key={s.t}
              icon={ICONS[i]}
              kicker={`0${i + 1}`}
              title={s.t}
              desc={s.d}
              delay={i * 90}
              onOpen={() => openDetail(PAGES[i])}
            />
          ))}
        </div>
        <div className="closing rise" ref={end}>
          <h2>{r.end}</h2>
          <div className="closing__row">
            <Glass as="button" type="button" className="btn btn--solid" radius={999} bevel={27} depth={0.7} frost={0.3} dim={0} tint={[0.96, 0.97, 1, 0.86]} press onClick={() => goTo('test')}>
              {r.endCta}
            </Glass>
          </div>
        </div>
      </div>
    </section>
  )
}
