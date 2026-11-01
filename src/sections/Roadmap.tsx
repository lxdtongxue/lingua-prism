import { useI18n } from '../components/i18n'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { useReveal } from '../components/useReveal'
import { engine } from '../gl/engine'

export function Roadmap() {
  const { t } = useI18n()
  const r = t.roadmap
  const end = useReveal<HTMLDivElement>()
  return (
    <section id="roadmap" className="section section--end">
      <div className="wrap">
        <SectionHead kicker={r.kicker} title={r.title} />
        <ol className="steps">
          {r.steps.map((s, i) => (
            <Glass as="li" className="step" radius={30} bevel={13} frost={0.74} dim={0.42} delay={i * 90} key={s.t}>
              <span className="step__n">{i + 1}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </Glass>
          ))}
        </ol>
        <div className="closing rise" ref={end}>
          <h2>{r.end}</h2>
          <Glass
            as="button"
            type="button"
            className="btn btn--solid"
            radius={999}
            bevel={27}
            depth={0.7}
            frost={0.3}
            dim={0}
            tint={[0.96, 0.97, 1, 0.86]}
            press
            onClick={() => document.getElementById('lab')?.scrollIntoView({ behavior: engine.reduced ? 'auto' : 'smooth' })}
          >
            {r.endCta}
          </Glass>
        </div>
      </div>
    </section>
  )
}
