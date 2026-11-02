import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ChevronRight, Info, ListOrdered, SlidersHorizontal } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { CLEAR } from '../components/Card'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { Sheet } from '../components/Sheet'
import { DEMO_LANGS, DIMS, type Dim } from '../content/content'
import demands from '../data/language_demands.json'
import { scoreT } from '../a/similarity'
import { PROVISIONAL } from '../data/citations'
import { A_DEFAULT_WEIGHT, ABILITIES, explainA, scoreA, weightedScore, type Ability, type Lang as Demand } from '../a/score'
import { useTall } from '../components/tall'
import { LANGUAGES, sortedLanguages, toggleLanguage, useKnownLanguages, type Slot } from '../components/languages'
import { goTo } from '../components/pager'
import { engine, Spring } from '../gl/engine'

type Goal = 'job' | 'study' | 'travel' | 'academic'
type W = Dim
const SHOW_TOP = 8
const THUMB_W = 46

function Slider({ dim, label, value, onChange, locked }: { dim: W; label: string; value: number; onChange: (v: number) => void; locked?: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const rest = useRef<HTMLSpanElement>(null)
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
        const x = THUMB_W / 2 + (pos.current.x / 100) * (w - THUMB_W)
        const stretch = Math.min(Math.abs(pos.current.v) / 900, 0.3)
        const grow = 1 + held.current.x * 0.16
        if (thumb.current) thumb.current.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scale(${(grow * (1 + stretch)).toFixed(3)},${(grow * (1 - stretch * 0.4)).toFixed(3)})`
        // The glass is drawn behind the page, so the track parts around it.
        const gap = THUMB_W / 2 + 3
        if (fill.current) fill.current.style.transform = `scaleX(${(Math.max(0, x - gap) / Math.max(1, w)).toFixed(4)})`
        if (rest.current) rest.current.style.transform = `scaleX(${(Math.max(0, w - x - gap) / Math.max(1, w)).toFixed(4)})`
      }),
    [],
  )

  const at = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect()
    onChange(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left - THUMB_W / 2) / (r.width - THUMB_W)) * 100))))
  }
  const onKey = (e: KeyboardEvent) => {
    if (locked) return
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0
    if (!d) return
    e.preventDefault()
    onChange(Math.min(100, Math.max(0, value + d)))
  }

  return (
    <div className={`slider tone-${dim}${locked ? ' slider--locked' : ''}`}>
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
        aria-disabled={locked}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (locked) return
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
          <span className="slider__rest" ref={rest} />
          <Glass as="span" className="slider__thumb" radius={15} bevel={14} depth={1.7} frost={0} dim={0} tint={[1, 1, 1, 0.05]} shadow={0.55} reveal={false} layer={3} elRef={thumb} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

type Row = { id: string; name: string; native?: string; values: Partial<Record<Dim, number | null>>; score: number | null; a: number | null; t: ReturnType<typeof scoreT>; lang: (typeof demands)[number] }

const HARD: Record<Ability, 'grammar' | 'sound' | 'script'> = { LA: 'grammar', SD: 'sound', VL: 'script' }

function RankList({ rows, dims, onOpen, liked, onLike, refs }: { rows: Row[]; dims: readonly Dim[]; onOpen: (id: string) => void; liked: Set<string>; onLike: (id: string) => void; refs?: Map<string, HTMLLIElement> }) {
  const { t } = useI18n()
  const l = t.lab
  return (
    <ol className="rank">
      {rows.map((r, i) => (
        <li
          key={r.id}
          ref={(el) => {
            if (!refs) return
            if (el) refs.set(r.id, el)
            else refs.delete(r.id)
          }}
        >
          <button type="button" className="rank__row" onClick={() => onOpen(r.id)}>
            <span className="rank__n">{i + 1}</span>
            <span className="rank__name">
              <strong>{r.name}</strong>
              {r.native && <span>{r.native}</span>}
            </span>
            <span className="rank__bars" style={{ '--n': dims.length } as React.CSSProperties}>
              {dims.map((k) => {
                const v = r.values[k]
                return (
                  <span key={k} className={`bar tone-${k}${v == null ? ' bar--off' : ''}`} title={l.dimShort[k]}>
                    <i style={{ transform: `scaleX(${(v ?? 0) / 100})` }} />
                  </span>
                )
              })}
            </span>
            <span className="rank__score">{r.score == null ? '—' : Math.round(r.score)}</span>
          </button>
          <button type="button" className={`like${liked.has(r.id) ? ' on' : ''}`} aria-pressed={liked.has(r.id)} aria-label={`${l.like}: ${r.name}`} onClick={() => onLike(r.id)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M12 3.2 21 19.5H3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          </button>
        </li>
      ))}
    </ol>
  )
}

export function Lab() {
  const { t, lang } = useI18n()
  const l = t.lab
  const { percentiles, count, placeholder } = useTall()
  const known = useKnownLanguages()
  const [goal, setGoal] = useState<Goal>('study')
  const [demo, setDemo] = useState(false)
  const [weights, setW] = useState<Record<W, number>>({ T: 40, A: A_DEFAULT_WEIGHT, G: 60, R: 40, P: 30 })
  const [liked, setLiked] = useState<Set<string>>(() => new Set())
  const [open, setOpen] = useState<'adjust' | 'all' | 'langs' | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [lastDetail, setLastDetail] = useState<string | null>(null)

  const hasA = count > 0
  const dims: readonly Dim[] = demo ? DIMS : (['T', 'A', 'P'] as const)
  const w: Record<W, number> = { ...weights, A: hasA ? weights.A : 0, ...(demo ? {} : { G: 0, R: 0 }) }

  const rows = useMemo(() => {
    // Languages you already have are never recommended.
    const have = new Set([...known.l1, ...known.l2])
    const pool = (demo ? demands.filter((d) => DEMO_LANGS.some((x) => x.id === d.id)) : demands).filter((d) => !have.has(d.id))
    const list: Row[] = pool.map((d) => {
      const a = scoreA(d as Demand, percentiles)
      const p = liked.size ? (liked.has(d.id) ? 100 : 0) : null
      const ph = DEMO_LANGS.find((x) => x.id === d.id)
      const t = scoreT(d.id, [...have])
      const values: Row['values'] = { T: t?.value ?? null, A: a, P: p }
      if (demo && ph) Object.assign(values, { G: ph.G[goal] * 100, R: ph.R * 100 })
      return { id: d.id, name: lang === 'zh' ? d.zh : d.en, native: ph?.native, values, a, t, score: weightedScore(values, w), lang: d }
    })
    return list.sort((x, y) => (y.score ?? -1) - (x.score ?? -1))
    // `w` is rebuilt from its inputs every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, known, goal, weights, liked, percentiles, lang, hasA])

  const shown = rows.slice(0, SHOW_TOP)

  // FLIP: rows glide to their new rank instead of snapping.
  const rowEls = useRef(new Map<string, HTMLLIElement>())
  const prev = useRef(new Map<string, number>())
  useLayoutEffect(() => {
    rowEls.current.forEach((el, id) => {
      // A hidden tab has no layout to animate from.
      if (!el.offsetParent) {
        prev.current.delete(id)
        return
      }
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
  }, [rows])

  const toggle = (id: string) =>
    setLiked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const openDetail = (id: string) => {
    setLastDetail(id)
    setDetail(id)
  }
  const pick = rows.find((r) => r.id === lastDetail) ?? rows[0]
  const nameOf = (id: string) => LANGUAGES.find((x) => x.id === id)?.[lang] ?? id
  const listOf = (slot: Slot) => known[slot].map(nameOf).join(lang === 'zh' ? '、' : ', ') || l.langsNone
  const why = pick ? explainA(pick.lang as Demand, percentiles) : ({ kind: 'none' } as const)
  const whyText =
    why.kind === 'none'
      ? l.whyNone
      : (why.kind === 'focus'
          ? l.whyFocus
              .replace('{hard}', l.hard[HARD[why.ability]])
              .replace('{share}', String(Math.round(why.share * 100)))
              .replace('{ability}', t.test.abilities[why.ability])
              .replace('{p}', String(why.percentile))
          : l.whyBalanced) + (why.even ? l.whyEven : '')
  const flags = PROVISIONAL.filter((x) => x.zh === pick?.lang.zh)
  const partial = pick?.lang.la_source === 'grambank+ai_fill'

  return (
    <section id="lab" className="section">
      <div className="wrap">
        <SectionHead kicker={l.kicker} title={l.title} intro={l.intro} />
        <div className="lab">
          <div className="lab__side">
          <Glass as="button" type="button" className="lab__langs" radius={26} {...CLEAR} press onClick={() => setOpen('langs')}>
            <span>
              <b>L1</b> {listOf('l1')}
            </span>
            <span>
              <b>L2</b> {listOf('l2')}
            </span>
            <ChevronRight size={18} strokeWidth={1.8} />
          </Glass>
          <Glass as="button" type="button" className="lab__ctl" radius={32} {...CLEAR} press onClick={() => setOpen('adjust')}>
            <span className="lab__sum">
              <span className="micro">{l.summary}</span>
              <strong>{hasA ? l.haveTall.replace('{n}', String(count)) : l.noTall}</strong>
            </span>
            <span className="lab__meters" style={{ '--n': dims.length } as React.CSSProperties}>
              {dims.map((k) => (
                <span key={k} className={`meter tone-${k}`}>
                  <b>{k}</b>
                  <i>
                    <u style={{ transform: `scaleX(${w[k] / 100})` }} />
                  </i>
                </span>
              ))}
            </span>
            <span className="lab__adjust">
              <SlidersHorizontal size={16} strokeWidth={1.8} />
              {l.adjust}
            </span>
          </Glass>
          </div>

          <Glass className="lab__out" radius={32} {...CLEAR} frost={0.34} dim={0.34} delay={100}>
            <header>
              <h3>{l.results}</h3>
              {demo ? <em className="tag tag--demo">{l.demoTag}</em> : <em className="tag">{l.experimental}</em>}
              {placeholder && <em className="tag tag--demo">{l.placeholderTag}</em>}
            </header>
            {!hasA && (
              <button type="button" className="lab__prompt" onClick={() => goTo('test')}>
                {l.prompt}
              </button>
            )}
            {rows.length === 0 && <p className="note">{l.emptyPool}</p>}
            <RankList rows={shown} dims={dims} onOpen={openDetail} liked={liked} onLike={toggle} refs={rowEls.current} />
            {rows.length > SHOW_TOP && (
              <button type="button" className="lab__more" onClick={() => setOpen('all')}>
                <ListOrdered size={16} strokeWidth={1.8} />
                {l.seeAll.replace('{n}', String(rows.length))}
              </button>
            )}
          </Glass>
        </div>
      </div>

      <Sheet open={open === 'langs'} onClose={() => setOpen(null)} kicker={l.kicker} title={l.langsTitle}>
        <p className="sheet__lead">{l.langsHint}</p>
        <div className="lab__form">
          {(['l1', 'l2'] as const).map((slot) => (
            <fieldset key={slot}>
              <legend>{l[slot]}</legend>
              <div className="chips chips--lang">
                {sortedLanguages(lang).map((x) => (
                  <button key={x.id} type="button" className="chip" aria-pressed={known[slot].includes(x.id)} onClick={() => toggleLanguage(slot, x.id)}>
                    {x[lang]}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {!known.l1.includes('zh') && <p className="note note--end">{l.langsNorm}</p>}
      </Sheet>

      <Sheet open={open === 'adjust'} onClose={() => setOpen(null)} kicker={l.kicker} title={l.adjust}>
        <div className="lab__form">
          <fieldset>
            <legend>{l.weights}</legend>
            <Slider dim="T" label={l.dimShort.T} value={w.T} onChange={(v) => setW((o) => ({ ...o, T: v }))} />
            <Slider dim="A" label={l.dimShort.A} value={w.A} locked={!hasA} onChange={(v) => setW((o) => ({ ...o, A: v }))} />
            {!hasA && <p className="locked tone-A">{l.locked}</p>}
            <Slider dim="P" label={l.dimShort.P} value={w.P} onChange={(v) => setW((o) => ({ ...o, P: v }))} />
          </fieldset>
          <fieldset>
            <legend>{l.demoLabel}</legend>
            <label className="switch">
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
              <span>{l.demoSwitch}</span>
            </label>
            <p className="note">{l.demoNote}</p>
          </fieldset>
          {demo && (
            <>
              <fieldset>
                <legend>{l.goal}</legend>
                <div className="chips">
                  {l.goals.map(([id, label]) => (
                    <button key={id} type="button" className="chip" aria-pressed={goal === id} onClick={() => setGoal(id as Goal)}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                {(['G', 'R'] as const).map((k) => (
                  <Slider key={k} dim={k} label={l.dimShort[k]} value={weights[k]} onChange={(v) => setW((o) => ({ ...o, [k]: v }))} />
                ))}
              </fieldset>
            </>
          )}
        </div>
      </Sheet>

      <Sheet open={open === 'all'} onClose={() => setOpen(null)} kicker={l.kicker} title={l.results}>
        <RankList
          rows={rows}
          dims={dims}
          onOpen={(id) => {
            setOpen(null)
            openDetail(id)
          }}
          liked={liked}
          onLike={toggle}
        />
      </Sheet>

      {pick && (
      <Sheet open={detail !== null} onClose={() => setDetail(null)} kicker={l.results} title={pick.name}>
        <div className="lang-a">
          <b>{pick.t ? Math.round(pick.t.value) : '—'}</b>
          <span>{l.tLabel}</span>
          <b>{pick.a == null ? '—' : Math.round(pick.a)}</b>
          <span>{l.aLabel}</span>
        </div>
        <p className="sheet__lead">{pick.t ? l.whyT.replace('{name}', nameOf(pick.t.nearest)).replace('{s}', String(Math.round(pick.t.value))) : l.whyTNone}</p>
        <p className="sheet__lead">{whyText}</p>
        <div className="bars">
          {ABILITIES.map((k) => (
            <div className="pbar" key={k}>
              <span>{l.hard[HARD[k]]}</span>
              <i>
                <u style={{ transform: `scaleX(${pick.lang[`D_${k}`]})` }} />
              </i>
              <b>{pick.lang[`D_${k}`].toFixed(2)}</b>
            </div>
          ))}
        </div>
        <p className="sheet__note">
          <Info size={15} strokeWidth={1.8} />
          {l.tNote} {l.aNote}
        </p>
        {(flags.length > 0 || partial) && (
          <p className="note">
            {l.provisional}
            {flags.map((x) => `${l.hard[HARD[x.item as Ability]]}：${x.how[lang]}`).join('；')}
            {partial ? l.partial : ''}
          </p>
        )}
      </Sheet>
      )}
    </section>
  )
}
