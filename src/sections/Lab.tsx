import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useI18n } from '../components/i18n'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { DEMO_LANGS, DIMS, type Dim } from '../content/content'
import { engine, Spring } from '../gl/engine'

type Known = 'zh' | 'zh-en'
type Goal = 'job' | 'study' | 'travel' | 'academic'
const WEIGHTED = ['T', 'G', 'R', 'P'] as const
type W = (typeof WEIGHTED)[number]

function Slider({ dim, label, value, onChange }: { dim: W; label: string; value: number; onChange: (v: number) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLSpanElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const pos = useRef(new Spring(value, 420, 34))
  const held = useRef(new Spring(0, 320, 26))
  const dragged = useRef(false)
  const start = useRef([0, 0])

  useEffect(() => {
    pos.current.target = value
  }, [value])

  useEffect(
    () =>
      engine.onFrame((dt) => {
        pos.current.step(dt)
        held.current.step(dt)
        const w = track.current?.clientWidth ?? 0
        const x = (pos.current.x / 100) * w
        const stretch = Math.min(Math.abs(pos.current.v) / 900, 0.3)
        const grow = 1 + held.current.x * 0.16
        if (thumb.current) thumb.current.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scale(${(grow * (1 + stretch)).toFixed(3)},${(grow * (1 - stretch * 0.4)).toFixed(3)})`
        if (fill.current) fill.current.style.transform = `scaleX(${Math.max(0, pos.current.x / 100).toFixed(4)})`
      }),
    [],
  )

  const at = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect()
    onChange(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))))
  }
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0
    if (!d) return
    e.preventDefault()
    onChange(Math.min(100, Math.max(0, value + d)))
  }

  return (
    <div className={`slider tone-${dim}`}>
      <div className="slider__label">
        <b>{dim}</b>
        <span>{label}</span>
        <output>{value}</output>
      </div>
      <div
        className="slider__hit"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          held.current.target = 1
          // A finger may be starting a page scroll, so touch waits for a sideways drag or a tap.
          start.current = [e.clientX, e.clientY]
          if (e.pointerType === 'mouse') at(e)
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
          if (e.pointerType !== 'mouse' && !dragged.current) {
            const dx = Math.abs(e.clientX - start.current[0])
            const dy = Math.abs(e.clientY - start.current[1])
            if (dx < 6 || dx < dy) return
            dragged.current = true
          }
          at(e)
        }}
        onPointerUp={(e) => {
          if (e.pointerType !== 'mouse' && !dragged.current) at(e)
          dragged.current = false
          held.current.target = 0
        }}
        onPointerCancel={() => {
          dragged.current = false
          held.current.target = 0
        }}
      >
        <div className="slider__track" ref={track}>
          <span className="slider__fill" ref={fill} />
          <span className="slider__thumb chrome" ref={thumb} />
        </div>
      </div>
    </div>
  )
}

export function Lab() {
  const { t, lang } = useI18n()
  const l = t.lab
  const [known, setKnown] = useState<Known>('zh-en')
  const [goal, setGoal] = useState<Goal>('study')
  const [w, setW] = useState<Record<W, number>>({ T: 40, G: 80, R: 50, P: 60 })
  const [liked, setLiked] = useState<Set<string>>(() => new Set(['ja']))

  const ranked = useMemo(() => {
    const rows = DEMO_LANGS.map((d) => {
      const v: Record<Dim, number> = { T: d.T[known], A: d.A, G: d.G[goal], R: d.R, P: liked.has(d.id) ? 0.92 : 0.28 }
      const total = WEIGHTED.reduce((a, k) => a + w[k], 0) || 1
      const s = WEIGHTED.reduce((a, k) => a + w[k] * v[k], 0) / total
      return { d, v, s }
    })
    return rows.sort((a, b) => b.s - a.s)
  }, [known, goal, w, liked])

  // FLIP: rows glide to their new rank instead of snapping.
  const rowEls = useRef(new Map<string, HTMLLIElement>())
  const prev = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    rowEls.current.forEach((el, id) => {
      const top = el.offsetTop
      const old = prev.current.get(id)
      if (old !== undefined && old !== top && !engine.reduced) {
        el.animate([{ transform: `translate3d(0,${old - top}px,0)` }, { transform: 'translate3d(0,0,0)' }], {
          duration: 620,
          easing: 'cubic-bezier(.22,1.2,.36,1)',
        })
      }
      prev.current.set(id, top)
    })
  }, [ranked])

  const toggle = (id: string) =>
    setLiked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <section id="lab" className="section">
      <div className="wrap">
        <SectionHead kicker={l.kicker} title={l.title} intro={l.intro} />
        <div className="lab">
          <Glass className="lab__ctl" radius={38} bevel={15} frost={0.74} dim={0.42}>
            <fieldset>
              <legend>{l.known}</legend>
              <div className="chips">
                {l.knownOpts.map(([id, label]) => (
                  <button key={id} className="chip" aria-pressed={known === id} onClick={() => setKnown(id as Known)}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{l.goal}</legend>
              <div className="chips">
                {l.goals.map(([id, label]) => (
                  <button key={id} className="chip" aria-pressed={goal === id} onClick={() => setGoal(id as Goal)}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>{l.weights}</legend>
              {WEIGHTED.map((k) => (
                <Slider key={k} dim={k} label={l.dimShort[k]} value={w[k]} onChange={(v) => setW((o) => ({ ...o, [k]: v }))} />
              ))}
              <p className="locked tone-A">
                <b>A</b>
                <span>{l.locked}</span>
              </p>
            </fieldset>
          </Glass>

          <Glass className="lab__out" radius={38} bevel={15} frost={0.74} dim={0.42} delay={100}>
            <header>
              <h3>{l.results}</h3>
              <em className="tag tag--demo">{l.demoTag}</em>
            </header>
            <p className="note">{l.demoNote}</p>
            <ol className="rank">
              {ranked.map(({ d, v }, i) => (
                <li
                  key={d.id}
                  ref={(el) => {
                    if (el) rowEls.current.set(d.id, el)
                    else rowEls.current.delete(d.id)
                  }}
                >
                  <span className="rank__n">{i + 1}</span>
                  <div className="rank__name">
                    <strong>{lang === 'zh' ? d.zh : d.en}</strong>
                    <span>{d.native}</span>
                  </div>
                  <div className="rank__bars">
                    {DIMS.map((k) => (
                      <span key={k} className={`bar tone-${k}${k === 'A' ? ' bar--off' : ''}`} title={l.dimShort[k]}>
                        <i style={{ transform: `scaleX(${v[k]})` }} />
                      </span>
                    ))}
                  </div>
                  <button className={`like${liked.has(d.id) ? ' on' : ''}`} aria-pressed={liked.has(d.id)} aria-label={`${l.like}: ${lang === 'zh' ? d.zh : d.en}`} onClick={() => toggle(d.id)}>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path d="M12 3.2 21 19.5H3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ol>
            <p className="note note--end">{l.likeHint}</p>
          </Glass>
        </div>
      </div>
    </section>
  )
}
