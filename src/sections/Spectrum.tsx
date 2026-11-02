import { useRef, useState, type KeyboardEvent } from 'react'
import { BookOpen, Heart, Network, Plus, Sparkles, Target } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { CLEAR } from '../components/Card'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { Sheet } from '../components/Sheet'
import { useLens } from '../components/useLens'
import { DIMS, DIM_RGB } from '../content/content'
import { engine } from '../gl/engine'

const RAY_ORDER = ['P', 'G', 'R', 'T', 'A']
const ICONS = { T: Network, A: Sparkles, G: Target, R: BookOpen, P: Heart }

export function Spectrum() {
  const { t } = useI18n()
  const s = t.spectrum
  const [sel, setSel] = useState(0)
  const [open, setOpen] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const lens = useRef<HTMLElement>(null)
  const dim = DIMS[sel]
  const it = s.items[dim]
  const Icon = ICONS[dim]

  const choose = (i: number) => {
    setSel(i)
    engine.setPoolColor(2, DIM_RGB[DIMS[i]])
    engine.focusRay(RAY_ORDER.indexOf(DIMS[i]))
  }

  useLens(lens, tabs, sel, choose)

  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const n = (sel + step + DIMS.length) % DIMS.length
    choose(n)
    tabs.current[n]?.focus()
  }

  return (
    <section id="spectrum" className="section">
      <div className="wrap">
        <SectionHead kicker={s.kicker} title={s.title} intro={s.intro} />
        <Glass className="rail" radius={40} {...CLEAR}>
          <Glass className="rail__lens" radius={32} bevel={16} depth={1.7} frost={0} dim={0} tint={[1, 1, 1, 0.05]} shadow={0.5} reveal={false} layer={1} elRef={lens} />
          <div className="rail__tabs" role="tablist" aria-label={s.title} onKeyDown={onKey}>
            {DIMS.map((d, i) => (
              <button
                key={d}
                ref={(el) => {
                  tabs.current[i] = el
                }}
                role="tab"
                aria-selected={sel === i}
                tabIndex={sel === i ? 0 : -1}
                className={`rail__tab tone-${d}`}
                onClick={() => choose(i)}
              >
                <b>{d}</b>
                <span>{s.items[d].name}</span>
              </button>
            ))}
          </div>
        </Glass>

        <Glass as="button" type="button" className={`detail tone-${dim}`} radius={38} {...CLEAR} press onClick={() => setOpen(true)}>
          <span className="detail__swap" key={dim}>
            <span className="card__top">
              <span className="card__icon">
                <Icon size={20} strokeWidth={1.7} />
              </span>
              <span className="micro">{it.level}</span>
            </span>
            <strong className="detail__name">{it.name}</strong>
            <span className="detail__q">{it.q}</span>
            <span className="detail__chips">
              {it.list.map(([k]) => (
                <em key={k}>{k}</em>
              ))}
            </span>
          </span>
          <span className="card__plus" aria-hidden="true">
            <Plus size={16} strokeWidth={2} />
          </span>
        </Glass>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} kicker={`${it.level} · ${it.en}`} title={it.name} tone={dim}>
        <p className="sheet__lead">{it.def}</p>
        <h4 className="sheet__sub">{it.listTitle}</h4>
        <ul className="facets">
          {it.list.map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong>
              <span>{v}</span>
            </li>
          ))}
        </ul>
        <h4 className="sheet__sub">{s.boundaryLabel}</h4>
        <p>{it.boundary}</p>
      </Sheet>
    </section>
  )
}
