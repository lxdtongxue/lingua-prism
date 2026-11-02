import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ChevronRight, ClipboardList, FileText, Info, ListOrdered, SlidersHorizontal } from 'lucide-react'
import { useI18n } from '../components/i18n'
import { CLEAR } from '../components/Card'
import { Glass } from '../components/Glass'
import { SectionHead } from '../components/SectionHead'
import { Sheet } from '../components/Sheet'
import { DIMS, NATIVE_NAMES, type Dim } from '../content/content'
import demands from '../data/language_demands.json'
import { scoreT } from '../a/similarity'
import { PROVISIONAL } from '../data/citations'
import { ABILITIES, explainA, scoreA, weightedScore, type Ability, type Lang as Demand } from '../a/score'
import { useTall } from '../components/tall'
import { LANGUAGES, sortedLanguages, toggleLanguage, useKnownLanguages, type Slot } from '../components/languages'
import { goTo } from '../components/pager'
import { setSlider, setTier, useDecision } from '../components/decision'
import { questions, REGION_EN } from '../decision/questions'
import { autoWeights, bestGoal, fixedWeights, interestOf, LANGS, modeTier, questionnaireWeights, report, scoresFor, SLIDER_MAX, weightInput, type Accept, type Scored, type Weights } from '../decision/score'
import { engine, Spring } from '../gl/engine'

type W = Dim
const SHOW_TOP = 8
const THUMB_W = 46

function Slider({ dim, label, value, max = 100, onChange, locked }: { dim: W; label: string; value: number; max?: number; onChange: (v: number) => void; locked?: boolean }) {
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
        const x = THUMB_W / 2 + (pos.current.x / max) * (w - THUMB_W)
        const stretch = Math.min(Math.abs(pos.current.v) / 900, 0.3)
        const grow = 1 + held.current.x * 0.16
        if (thumb.current) thumb.current.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scale(${(grow * (1 + stretch)).toFixed(3)},${(grow * (1 - stretch * 0.4)).toFixed(3)})`
        if (fill.current) fill.current.style.transform = `scaleX(${(x / Math.max(1, w)).toFixed(4)})`
      }),
    [max],
  )

  const at = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect()
    onChange(Math.round(Math.min(max, Math.max(0, ((e.clientX - r.left - THUMB_W / 2) / (r.width - THUMB_W)) * max))))
  }
  const onKey = (e: KeyboardEvent) => {
    if (locked) return
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : 0
    if (!d) return
    e.preventDefault()
    onChange(Math.min(max, Math.max(0, value + d)))
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
        aria-valuemax={max}
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
          {/* DOM glass, not canvas glass: it has to scroll and clip with the sheet. */}
          <span className="slider__thumb" ref={thumb} />
        </div>
      </div>
    </div>
  )
}

type Row = { id: string; name: string; native?: string; values: Partial<Record<Dim, number | null>>; score: number | null; a: number | null; t: ReturnType<typeof scoreT>; lang: (typeof demands)[number] }

const HARD: Record<Ability, 'grammar' | 'sound' | 'script'> = { LA: 'grammar', SD: 'sound', VL: 'script' }

function RankList({ rows, onOpen, refs }: { rows: Row[]; onOpen: (id: string) => void; refs?: Map<string, HTMLLIElement> }) {
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
            <span className="rank__bars" style={{ '--n': DIMS.length } as React.CSSProperties}>
              {DIMS.map((k) => {
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
  const { answers, tier, sliders } = useDecision()
  const c = questions[lang]
  const [open, setOpen] = useState<'adjust' | 'all' | 'langs' | 'report' | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [lastDetail, setLastDetail] = useState<string | null>(null)

  const hasA = count > 0
  const weightsIn = tier === 'sponsor' && answers.confirmed ? weightInput(answers) : null
  const auto = weightsIn ? questionnaireWeights(weightsIn) : null

  const { rows, w } = useMemo(() => {
    // Languages you already have are never recommended.
    const have = new Set([...known.l1, ...known.l2])
    const pool = demands.filter((d) => !have.has(d.id))
    const scored = pool.map((d) => ({ d, s: scoresFor(LANGS.find((x) => x.id === d.id)!, answers, tier) }))
    const missing = (['G', 'R', 'P'] as const).filter((k) => scored.length > 0 && scored.every((x) => x.s[k] === null))
    const chosen = auto ? autoWeights({ G: auto.G, R: auto.R, P: auto.P }, missing) : sliders
    const w: Weights = { ...fixedWeights(hasA), ...chosen }
    const list: Row[] = scored.map(({ d, s }) => {
      const a = scoreA(d as Demand, percentiles)
      const t = scoreT(d.id, [...have])
      const values: Row['values'] = { T: t?.value ?? null, A: a, ...s }
      return { id: d.id, name: lang === 'zh' ? d.zh : d.en, native: NATIVE_NAMES[d.id], values, a, t, score: weightedScore(values, w), lang: d }
    })
    return { rows: list.sort((x, y) => (y.score ?? -1) - (x.score ?? -1)), w }
  }, [known, answers, tier, sliders, percentiles, lang, hasA, auto])

  const off = (d: Scored) => rows.length > 0 && rows.every((r) => r.values[d] == null)
  const surveyHref = `${import.meta.env.BASE_URL}survey/`
  const reports = tier === 'sponsor' && answers.confirmed ? report(rows, w) : []

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
  const dec = LANGS.find((x) => x.id === pick?.id)
  const goal = bestGoal(answers.goals)
  const whyG = dec && pick?.values.G != null ? l.whyG.replace('{goal}', c.goalsShort[goal]).replace('{level}', l.levels[dec.g[goal] - 1]) : l.surveyFirst
  const whyR = dec ? l.whyR.replace('{cover}', l.levels[dec.r.coverage - 1]).replace('{mode}', c.modeWords[answers.mode]).replace('{level}', l.levels[modeTier(dec, answers.mode) - 1]) : ''
  const interest = dec ? interestOf(dec, answers) : null
  const acceptKeys: Accept[] = tier === 'sponsor' ? ['VL', 'SD', 'LA'] : ['VL', 'SD']
  const whyP = pick?.values.P == null
    ? l.surveyFirst
    : [
        interest != null ? l.whyP.replace('{region}', lang === 'zh' ? (dec?.region ?? '') : (REGION_EN[dec?.region ?? ''] ?? '')).replace('{score}', String(interest)) : '',
        // A language at the bottom of the scale doesn't demand this, so there is nothing to warn about.
        ...acceptKeys.filter((k) => answers.accept[k] != null && answers.accept[k] !== 3 && (dec?.[`D_${k}`] ?? 0) > 0.2).map((k) => l.whyAccept.replace('{need}', l.needs[k]).replace('{choice}', c.willing[(answers.accept[k] as number) - 1])),
      ].join('')
  const dimLine = (d: (typeof DIMS)[number], name: string) => `${l.dimShort[d]}（${Math.round(rows.find((x) => x.name === name)?.values[d] ?? 0)}）`
  const nameById = (id: string) => rows.find((x) => x.id === id)?.name ?? id

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
            <span className="lab__meters" style={{ '--n': DIMS.length } as React.CSSProperties}>
              {DIMS.map((k) => (
                <span key={k} className={`meter tone-${k}`}>
                  <b>{k}</b>
                  <i>
                    <u style={{ transform: `scaleX(${w[k] / SLIDER_MAX})` }} />
                  </i>
                </span>
              ))}
            </span>
            <span className="lab__adjust">
              <SlidersHorizontal size={16} strokeWidth={1.8} />
              {l.adjust}
            </span>
          </Glass>
          <a className="lab__survey" href={surveyHref}>
            <ClipboardList size={16} strokeWidth={1.8} />
            {answers.done ? l.surveyEdit : l.surveyStart}
          </a>
          </div>

          <Glass className="lab__out" radius={32} {...CLEAR} frost={0.34} dim={0.34} delay={100}>
            <header>
              <h3>{l.results}</h3>
              <em className="tag">{tier === 'sponsor' ? c.sponsorName : c.basicName}</em>
              {placeholder && <em className="tag tag--demo">{l.placeholderTag}</em>}
            </header>
            {!hasA && (
              <button type="button" className="lab__prompt" onClick={() => goTo('test')}>
                {l.prompt}
              </button>
            )}
            {rows.length === 0 && <p className="note">{l.emptyPool}</p>}
            <RankList rows={shown} onOpen={openDetail} refs={rowEls.current} />
            {rows.length > SHOW_TOP && (
              <button type="button" className="lab__more" onClick={() => setOpen('all')}>
                <ListOrdered size={16} strokeWidth={1.8} />
                {l.seeAll.replace('{n}', String(rows.length))}
              </button>
            )}
            {reports.length > 0 && (
              <button type="button" className="lab__more" onClick={() => setOpen('report')}>
                <FileText size={16} strokeWidth={1.8} />
                {l.reportOpen}
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
            <p className="note">{l.fixedNote}</p>
            {!hasA && <p className="locked tone-A">{l.locked}</p>}
            {auto ? (
              <>
                <p className="note">{l.autoNote}</p>
                {(['G', 'R', 'P'] as const).map((k) => (
                  <div className={`slider__label tone-${k}`} key={k}>
                    <b>{k}</b>
                    <span>{l.dimShort[k]}</span>
                    <output>{Math.round(w[k])}</output>
                  </div>
                ))}
                <a className="lab__survey" href={surveyHref}>
                  {l.surveyEdit}
                </a>
              </>
            ) : (
              (['G', 'R', 'P'] as const).map((k) => (
                <div key={k}>
                  <Slider dim={k} label={l.dimShort[k]} value={sliders[k]} max={SLIDER_MAX} locked={off(k)} onChange={(v) => setSlider(k, v)} />
                  {off(k) && <p className="locked">{l.fillFirst}</p>}
                </div>
              ))
            )}
          </fieldset>
          <fieldset>
            <legend>{l.tierLabel}</legend>
            <div className="chips">
              {(['basic', 'sponsor'] as const).map((id) => (
                <button key={id} type="button" className="chip" aria-pressed={tier === id} onClick={() => setTier(id)}>
                  {id === 'basic' ? c.basicName : c.sponsorName}
                </button>
              ))}
            </div>
            <p className="note">{l.tierNote}</p>
          </fieldset>
        </div>
      </Sheet>

      <Sheet open={open === 'report'} onClose={() => setOpen(null)} kicker={l.results} title={l.reportOpen}>
        <ol className="cites">
          {reports.map((r) => (
            <li key={r.id}>
              {l.reportTop.replace('{name}', nameById(r.id)).replace('{rank}', String(r.rank)).replace('{a}', dimLine(r.top[0], nameById(r.id))).replace('{b}', r.top[1] ? dimLine(r.top[1], nameById(r.id)) : '')}
              {r.weak && l.reportWeak.replace('{dim}', dimLine(r.weak, nameById(r.id)))}
              {r.flips.map((f) => l.reportFlip.replace('{dim}', l.dimShort[f.dim]).replace('{name}', nameById(f.id))).join('')}
            </li>
          ))}
        </ol>
      </Sheet>

      <Sheet open={open === 'all'} onClose={() => setOpen(null)} kicker={l.kicker} title={l.results}>
        <RankList
          rows={rows}
          onOpen={(id) => {
            setOpen(null)
            openDetail(id)
          }}
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
        <ul className="facets">
          {([['G', whyG], ['R', whyR], ['P', whyP]] as const).map(([k, text]) => (
            <li key={k}>
              <strong>
                {l.dimShort[k]} {pick.values[k] == null ? '—' : Math.round(pick.values[k] as number)}
              </strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
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
          {l.tNote} {l.aNote} {l.aiNote}
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
