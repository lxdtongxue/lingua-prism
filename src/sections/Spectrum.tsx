import { useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '../components/i18n'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { useLens } from '../components/useLens'
import { DIMS, DIM_RGB } from '../content/content'
import { engine } from '../gl/engine'

const RAY_ORDER = ['P', 'G', 'R', 'T', 'A']

export function Spectrum() {
  const { t } = useI18n()
  const s = t.spectrum
  const [sel, setSel] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const lens = useRef<HTMLElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const choose = (i: number) => {
    setSel(i)
    engine.setPoolColor(2, DIM_RGB[DIMS[i]])
    engine.focusRay(RAY_ORDER.indexOf(DIMS[i]))
  }

  useLens(lens, tabs, sel)

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
        <Glass className="rail" radius={40} bevel={13} frost={0.72} dim={0.42}>
          <Glass className="rail__lens" radius={32} bevel={14} depth={1.25} frost={0.2} dim={0} tint={[1, 1, 1, 0.075]} shadow={0.5} reveal={false} layer={1} elRef={lens} />
          <div className="rail__tabs" role="tablist" aria-label={s.title} onKeyDown={onKey}>
            {DIMS.map((d, i) => (
              <button
                key={d}
                ref={(el) => {
                  tabs.current[i] = el
                }}
                role="tab"
                id={`tab-${d}`}
                aria-selected={sel === i}
                aria-controls={`panel-${d}`}
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

        <Glass
          className={`detail tone-${DIMS[sel]}`}
          radius={38}
          bevel={15}
          frost={0.74}
          dim={0.42}
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerUp={(e) => {
            const o = swipe.current
            swipe.current = null
            if (!o || e.pointerType === 'mouse') return
            const dx = e.clientX - o.x
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - o.y) * 1.5) choose((sel + (dx < 0 ? 1 : -1) + DIMS.length) % DIMS.length)
          }}
        >
          <div className="detail__stack">
            {DIMS.map((d, i) => {
              const it = s.items[d]
              const on = i === sel
              return (
                <div key={d} id={`panel-${d}`} role="tabpanel" aria-labelledby={`tab-${d}`} aria-hidden={!on} className={`detail__pane${on ? ' on' : ''}`}>
                  <div className="detail__main">
                    <p className="micro">
                      {it.level} · {it.en}
                    </p>
                    <h3>{it.name}</h3>
                    <p className="detail__q">
                      <span>{s.coreLabel}</span>
                      {it.q}
                    </p>
                    <p>{it.def}</p>
                  </div>
                  <div className="detail__side">
                    <p className="micro">{it.listTitle}</p>
                    <ul>
                      {it.list.map(([k, v]) => (
                        <li key={k}>
                          <strong>{k}</strong>
                          <span>{v}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="boundary">
                      <p className="micro">{s.boundaryLabel}</p>
                      <p>{it.boundary}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Glass>
      </div>
    </section>
  )
}
