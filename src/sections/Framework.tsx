import { Languages, Scale, UserRound } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { Card } from '../components/Card'
import { openDetail } from '../components/Details'
import { SectionHead } from '../components/SectionHead'

const ICONS = [Languages, UserRound, Scale]
const PAGES = ['lang', 'learner', 'decision'] as const

export function Framework() {
  const { t } = useI18n()
  const f = t.framework
  return (
    <section id="framework" className="section">
      <div className="wrap">
        <SectionHead kicker={f.kicker} title={f.title} intro={f.intro} />
        <div className="levels">
          {f.items.map((x, i) => (
            <Card
              key={x.level}
              icon={ICONS[i]}
              kicker={x.level}
              title={x.q}
              desc={x.brief}
              delay={i * 110}
              onOpen={() => openDetail(PAGES[i])}
            >
              <span className="dots">
                {x.dims.map((d) => (
                  <i key={d} className={`dot dot--${d}`}>
                    {d}
                  </i>
                ))}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
