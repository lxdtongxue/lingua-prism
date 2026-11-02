import { Fragment, useState, type ReactNode } from 'react'
import { BookMarked, Database, Scale } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { Card } from '../components/Card'
import { Evidence } from '../components/Evidence'
import { SectionHead } from '../components/SectionHead'
import { Sheet } from '../components/Sheet'
import { CITATIONS } from '../data/citations'
import { FooterBody } from './Footer'

// Renders *italics* and bare URLs in the fixed citation text.
function cite(text: string): ReactNode {
  return text.split(/(\*[^*]+\*|https?:\/\/\S+)/).map((part, i) => {
    if (part.startsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('http')) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer">
          {part}
        </a>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

type View = 'studies' | 'data' | 'license'

export function References() {
  const { t } = useI18n()
  const r = t.refs
  const [open, setOpen] = useState<View | null>(null)
  const close = () => setOpen(null)
  return (
    <section id="references" className="section">
      <div className="wrap">
        <SectionHead kicker={r.kicker} title={r.title} intro={r.intro} />
        <div className="refs">
          <Card icon={BookMarked} kicker="14" title={r.studies} desc={r.studiesD} onOpen={() => setOpen('studies')} />
          <Card icon={Database} kicker={String(CITATIONS.length)} title={r.data} desc={r.dataD} delay={80} onOpen={() => setOpen('data')} />
          <Card icon={Scale} title={r.license} desc={r.licenseD} delay={160} onOpen={() => setOpen('license')} />
        </div>
      </div>
      <Sheet open={open === 'studies'} onClose={close} kicker={r.kicker} title={r.studies} fill>
        <Evidence />
      </Sheet>
      <Sheet open={open === 'data'} onClose={close} kicker={r.kicker} title={r.data}>
        <ol className="cites">
          {CITATIONS.map((c) => (
            <li key={c}>{cite(c)}</li>
          ))}
        </ol>
      </Sheet>
      <Sheet open={open === 'license'} onClose={close} kicker={r.kicker} title={r.license}>
        <ul className="facets">
          {r.licenses.map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong>
              <span>{v}</span>
            </li>
          ))}
        </ul>
        <div className="foot-body">
          <FooterBody />
        </div>
      </Sheet>
    </section>
  )
}
