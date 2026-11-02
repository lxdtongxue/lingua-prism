import { useState } from 'react'
import { Languages, Scale, UserRound } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { Card } from '../components/Card'
import { Sheet } from '../components/Sheet'
import { SectionHead } from '../components/SectionHead'

const ICONS = [Languages, UserRound, Scale]

export function Framework() {
  const { t } = useI18n()
  const f = t.framework
  const [open, setOpen] = useState<number | null>(null)
  const [last, setLast] = useState(0)
  const it = f.items[last]
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
              onOpen={() => {
                setLast(i)
                setOpen(i)
              }}
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
      <Sheet open={open !== null} onClose={() => setOpen(null)} kicker={it.level} title={it.q}>
        <p className="sheet__lead">{it.eg}</p>
        <dl className="facts">
          <div>
            <dt>{f.objectLabel}</dt>
            <dd>{it.object}</dd>
          </div>
          <div>
            <dt>{f.sourceLabel}</dt>
            <dd>{it.src}</dd>
          </div>
        </dl>
      </Sheet>
    </section>
  )
}
