import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { details, type Block, type PageId } from '../content/details'
import { Radar } from '../sections/Aptitude'
import { useI18n } from './i18n'
import { Sheet } from './Sheet'

let current: PageId | null = null
// Pages reached through "further reading", so each can step back to the one before.
let trail: { id: PageId; y: number }[] = []
let restoreY = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

export function openDetail(id: PageId | null) {
  current = id
  trail = []
  restoreY = 0
  emit()
}

function follow(id: PageId, y: number) {
  if (current) trail = [...trail, { id: current, y }]
  current = id
  restoreY = 0
  emit()
}

function back() {
  const prev = trail[trail.length - 1]
  if (!prev) return
  trail = trail.slice(0, -1)
  current = prev.id
  restoreY = prev.y
  emit()
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function Abilities({ items }: { items: Extract<Block, { abilities: unknown }>['abilities'] }) {
  const [focus, setFocus] = useState(-1)
  return (
    <>
      <div className="sheet__radar">
        <Radar focus={focus} />
      </div>
      <ul className="abilities">
        {items.map((b, i) => (
          <li key={b.id} tabIndex={0} className={focus === i ? 'on' : ''} onPointerEnter={() => setFocus(i)} onPointerLeave={() => setFocus(-1)} onFocus={() => setFocus(i)} onBlur={() => setFocus(-1)}>
            <span className="abbr">{b.id}</span>
            <div>
              <h4>{b.name}</h4>
              <p>{b.text}</p>
              <small>{b.task}</small>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function Part({ b }: { b: Block }) {
  if ('h' in b) return <h4 className="dt__h">{b.h}</h4>
  if ('p' in b) return <p className="dt__p">{b.p}</p>
  if ('key' in b) return <p className="dt__key">{b.key}</p>
  if ('abilities' in b) return <Abilities items={b.abilities} />
  if ('list' in b) {
    return (
      <ul className="dt__list">
        {b.list.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    )
  }
  if ('cards' in b) {
    return (
      <div className="dt__cards">
        {b.cards.map(([k, v]) => (
          <div className="layer" key={k}>
            <h4>{k}</h4>
            <p>{v}</p>
          </div>
        ))}
      </div>
    )
  }
  if ('steps' in b) {
    return (
      <ol className="chain">
        {b.steps.map(([k, v], i) => (
          <li className="chain__node" key={k}>
            <span className="micro">{i + 1}</span>
            <h4>{k}</h4>
            <p>{v}</p>
          </li>
        ))}
      </ol>
    )
  }
  if ('table' in b) {
    return (
      <div className="dt__scroll">
        <table className="dt__table">
          <thead>
            <tr>
              {b.table.head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.table.rows.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <div className="tools">
      {b.choices.map((c) => (
        <article className="tool" key={c.name}>
          <header>
            <strong>{c.name}</strong>
            <em className={c.used ? 'tag tag--core' : 'tag'}>{c.tag}</em>
          </header>
          <ul className="dt__list">
            {c.points.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}

// All six second-level pages share this one sheet, so "further reading" can move
// between pages from different sections without closing it.
export function Details() {
  const { t, lang } = useI18n()
  const open = useSyncExternalStore(subscribe, () => current)
  const [last, setLast] = useState<PageId>('lang')
  const top = useRef<HTMLDivElement>(null)
  const body = () => top.current?.closest('.sheet__body')
  useEffect(() => {
    if (!open) return
    setLast(open)
    body()?.scrollTo(0, restoreY)
  }, [open])
  const prev = open ? trail[trail.length - 1] : undefined
  const pages = details[lang]
  const page = pages[open ?? last]
  return (
    <Sheet open={open !== null} onClose={() => openDetail(null)} kicker={page.kicker} title={page.title}>
      <div ref={top} className="dt">
        {prev && (
          <button type="button" className="dt__back" onClick={back}>
            <ArrowLeft size={15} strokeWidth={1.8} />
            {t.backTo}
            {pages[prev.id].title}
          </button>
        )}
        <p className="sheet__lead">{page.lead}</p>
        {page.blocks.map((b, i) => (
          <Part key={`${open ?? last}${i}`} b={b} />
        ))}
        <nav className="dt__more" aria-label={t.moreReading}>
          <p>{t.moreReading}</p>
          {page.more.map((id) => (
            <button key={id} type="button" className="dt__link" onClick={() => follow(id, body()?.scrollTop ?? 0)}>
              {pages[id].kicker.split(' · ').pop()}：{pages[id].title}
              <ArrowRight size={15} strokeWidth={1.8} />
            </button>
          ))}
        </nav>
      </div>
    </Sheet>
  )
}
