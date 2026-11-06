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
        <div className="about-project">
          <div className="about-project__story">
            <p>{f.project.background}</p>
            <p>{f.project.approach}</p>
            {f.project.xisu.map((para) => <p key={para.slice(0, 16)}>{para}</p>)}
            <p className="note">{f.project.audience}</p>
            <button type="button" className="sheet__cta sheet__cta--quiet" onClick={() => openDetail('project')}>{f.project.readMore}</button>
          </div>
          <ol className="about-project__journey" aria-label={f.project.journeyLabel}>
            {f.project.journey.map((step, i) => <li key={step}><span>{String(i + 1).padStart(2, '0')}</span><p>{step}</p></li>)}
          </ol>
        </div>
        <div className="about-project__framework"><h3>{f.project.frameworkTitle}</h3><p className="note">{f.project.frameworkIntro}</p></div>
        <div className="levels">
          {f.items.map((x, i) => (
            <Card
              key={x.level}
              icon={ICONS[i]}
              kicker={x.level}
              kickerSize="lg"
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
