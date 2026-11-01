import { useI18n } from '../components/i18n'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'

export function Framework() {
  const { t } = useI18n()
  const f = t.framework
  return (
    <section id="framework" className="section">
      <div className="wrap">
        <SectionHead kicker={f.kicker} title={f.title} intro={f.intro} />
        <div className="levels">
          {f.items.map((it, i) => (
            <Glass as="article" className="level" radius={34} bevel={15} frost={0.74} dim={0.42} delay={i * 110} key={it.level}>
              <header>
                <span className="micro">{it.level}</span>
                <span className="dots">
                  {it.dims.map((d) => (
                    <i key={d} className={`dot dot--${d}`}>
                      {d}
                    </i>
                  ))}
                </span>
              </header>
              <h3>{it.q}</h3>
              <p className="eg">{it.eg}</p>
              <dl>
                <div>
                  <dt>{f.objectLabel}</dt>
                  <dd>{it.object}</dd>
                </div>
                <div>
                  <dt>{f.sourceLabel}</dt>
                  <dd>{it.src}</dd>
                </div>
              </dl>
            </Glass>
          ))}
        </div>
      </div>
    </section>
  )
}
