import { useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from './i18n'
import { Glass } from './Glass'
import { useLens } from './useLens'
import { STUDIES } from '../content/content'
import { engine } from '../gl/engine'

const EASE = 'cubic-bezier(.22,1,.36,1)'
const MOVE_MS = 620
const FADE_OUT_MS = 240

type Snapshot = { height: number; rows: Map<string, { x: number; y: number; w: number }> }

export function Evidence() {
  const { t } = useI18n()
  const a = t.aptitude
  const [filter, setFilter] = useState(0)
  const active = a.filters[filter].id
  const lens = useRef<HTMLElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const list = useRef<HTMLUListElement>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())
  const before = useRef<Snapshot | null>(null)
  useLens(lens, tabs, filter)

  // Records where everything is on screen, mid-animation included, so a quick
  // second tap continues from the current position instead of jumping.
  const choose = (i: number) => {
    if (i === filter || !list.current) return
    const box = list.current.getBoundingClientRect()
    const snapshot: Snapshot = { height: box.height, rows: new Map() }
    rows.current.forEach((el, id) => {
      if (el.classList.contains('off')) return
      const q = el.getBoundingClientRect()
      snapshot.rows.set(id, { x: q.left - box.left, y: q.top - box.top, w: q.width })
    })
    before.current = snapshot
    setFilter(i)
  }

  // FLIP: rows glide to their new slots while the pane resizes like liquid.
  useLayoutEffect(() => {
    const prev = before.current
    const ul = list.current
    before.current = null
    if (!prev || !ul || engine.reduced) return
    ul.getAnimations().forEach((x) => x.cancel())
    rows.current.forEach((el) => {
      el.getAnimations().forEach((x) => x.cancel())
      el.removeAttribute('style')
    })
    ul.animate([{ height: `${prev.height}px` }, { height: `${ul.offsetHeight}px` }], { duration: MOVE_MS, easing: EASE })
    let entering = 0
    rows.current.forEach((el, id) => {
      const was = prev.rows.get(id)
      const shown = !el.classList.contains('off')
      if (shown && was) {
        const dx = was.x - el.offsetLeft
        const dy = was.y - el.offsetTop
        if (dx || dy) el.animate([{ transform: `translate3d(${dx}px,${dy}px,0)` }, { transform: 'none' }], { duration: MOVE_MS, easing: EASE })
      } else if (shown) {
        el.animate([{ opacity: 0, transform: 'translate3d(0,16px,0)' }, { opacity: 1, transform: 'none' }], {
          duration: MOVE_MS,
          easing: EASE,
          delay: 60 + entering++ * 26,
          fill: 'backwards',
        })
      } else if (was) {
        Object.assign(el.style, { display: 'grid', position: 'absolute', left: `${was.x}px`, top: `${was.y}px`, width: `${was.w}px` })
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_OUT_MS, easing: 'ease-out' }).onfinish = () => el.removeAttribute('style')
      }
    })
  }, [filter])

  return (
    <Glass className="evidence" radius={38} bevel={15} frost={0.74} dim={0.42}>
      <div className="evidence__head">
        <div>
          <h3>{a.evidenceTitle}</h3>
          <p>{a.evidenceIntro}</p>
        </div>
        <div className="seg" role="group" aria-label={a.evidenceTitle}>
          <Glass className="seg__lens" radius={999} bevel={20} depth={1.2} frost={0.15} dim={0} tint={[1, 1, 1, 0.085]} shadow={0.45} reveal={false} layer={1} elRef={lens} aria-hidden="true" />
          {a.filters.map((f, i) => (
            <button
              key={f.id}
              ref={(el) => {
                tabs.current[i] = el
              }}
              className="seg__btn"
              aria-pressed={filter === i}
              onClick={() => choose(i)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="studies" ref={list}>
        {STUDIES.map((s) => (
          <li
            key={s.id}
            className={active === 'all' || s.g.includes(active as 'p') ? undefined : 'off'}
            ref={(el) => {
              if (el) rows.current.set(s.id, el)
              else rows.current.delete(s.id)
            }}
          >
            <span className="abbr">{s.id}</span>
            <div>
              <strong>{s.cite}</strong>
              <span>{s.title}</span>
            </div>
          </li>
        ))}
      </ul>
    </Glass>
  )
}
