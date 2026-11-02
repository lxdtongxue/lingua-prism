import { useState } from 'react'
import { Calculator, Network, Ruler, Scale3d } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { Card } from '../components/Card'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { Sheet } from '../components/Sheet'
import { useReveal } from '../components/useReveal'
import { goTo } from '../components/pager'

const ICONS = [Network, Ruler, Calculator, Scale3d]

export function Roadmap() {
  const { t } = useI18n()
  const r = t.roadmap
  const end = useReveal<HTMLDivElement>()
  const [open, setOpen] = useState<number | null>(null)
  const [last, setLast] = useState(0)
  const step = r.steps[last]
  return (
    <section id="roadmap" className="section section--end">
      <div className="wrap">
        <SectionHead kicker={r.kicker} title={r.title} intro={r.goal} />
        <div className="steps">
          {r.steps.map((s, i) => (
            <Card
              key={s.t}
              icon={ICONS[i]}
              kicker={`0${i + 1}`}
              title={s.t}
              delay={i * 90}
              onOpen={() => {
                setLast(i)
                setOpen(i)
              }}
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
      <Sheet open={open !== null} onClose={() => setOpen(null)} kicker={`0${last + 1}`} title={step.t}>
        <p className="sheet__lead">{step.d}</p>
      </Sheet>
    </section>
  )
}
