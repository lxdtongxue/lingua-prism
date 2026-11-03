import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from './i18n'
import { engine } from '../gl/engine'
import { readSection } from '../paths'

const WORD = 'Lingua Prism'
const SEEN = 'intro-seen'
const TYPE_END = 0.62 // progress where the last letter lands
const FLY_START = 0.68
const IGNITE = 0.84 // the beam fires as the word nears the corner
const PAUSE_AT = (6 / WORD.length) * TYPE_END // after "Lingua"
const IDLE_MS = 1300

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function shouldPlay() {
  const forced = new URLSearchParams(location.search).has('intro')
  if (forced) return true
  if (engine.reduced || readSection(location.search, location.hash) || window.scrollY > 0) return false
  try {
    return !sessionStorage.getItem(SEEN)
  } catch {
    return true
  }
}

const enter = () => document.documentElement.classList.add('entered')

// First visit in a session: the name types itself. Scrolling or swiping drives it,
// and if the visitor does nothing it finishes on its own.
export function Intro({ blocked = false, skip = false }: { blocked?: boolean; skip?: boolean }) {
  const { t } = useI18n()
  const [play, setPlay] = useState(() => !skip && ((blocked && !engine.reduced && !readSection(location.search, location.hash)) || shouldPlay()))
  const root = useRef<HTMLDivElement>(null)
  const word = useRef<HTMLDivElement>(null)
  const caret = useRef<HTMLElement>(null)
  const hint = useRef<HTMLParagraphElement>(null)
  const chars = useRef<(HTMLSpanElement | null)[]>([])

  useLayoutEffect(() => {
    const html = document.documentElement
    if (blocked) {
      engine.holdIntro()
      engine.setPageAlpha(0, true)
      html.classList.add('updates-pending')
      return () => html.classList.remove('updates-pending')
    }
    if (!play) {
      engine.releaseIntro()
      engine.setPageAlpha(1)
      enter()
      return
    }
    engine.holdIntro()
    engine.setPageAlpha(0, true)
    html.classList.add('intro-on')
    return () => html.classList.remove('intro-on')
  }, [play, blocked])

  useEffect(() => {
    if (!play || blocked) return
    let p = 0
    let target = 0
    let lastInput = -1e9
    let pausedAt = 0
    let ignited = false
    let done = false
    let last = performance.now()
    let touchY: number | null = null
    let ready = false
    let base: DOMRect | null = null
    const ends: number[] = []

    const measure = () => {
      const el = word.current
      if (!el) return
      base = el.getBoundingClientRect()
      ends.length = 0
      chars.current.forEach((c) => ends.push(c ? c.offsetLeft + c.offsetWidth : 0))
      ready = true
    }
    const nudge = (d: number) => {
      lastInput = performance.now()
      target = clamp(target + d, 0.04, 1)
    }
    const onWheel = (e: WheelEvent) => nudge(e.deltaY / 1100)
    const onDown = (e: PointerEvent) => {
      touchY = e.clientY
    }
    const onMove = (e: PointerEvent) => {
      if (touchY === null) return
      nudge((touchY - e.clientY) / 420)
      touchY = e.clientY
    }
    const onUp = (e: PointerEvent) => {
      const tapped = touchY !== null && Math.abs(e.clientY - touchY) < 4 && performance.now() - lastInput > 300
      touchY = null
      if (tapped) target = 1
    }
    const onKey = () => {
      target = 1
    }

    const finish = () => {
      if (done) return
      done = true
      try {
        sessionStorage.setItem(SEEN, '1')
      } catch {
        /* the intro just replays next time */
      }
      setPlay(false)
    }

    const off = engine.onFrame(() => {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.25)
      last = now
      if (!ready) {
        if (word.current) measure()
        if (!ready) return
      }
      const idle = now - lastInput > IDLE_MS
      if (idle && target < 1) {
        if (target < PAUSE_AT) target = Math.min(PAUSE_AT, target + dt / 0.8)
        else if (pausedAt < 0.7) pausedAt += dt
        else target = Math.min(1, target + dt * 0.46)
      }
      p += (target - p) * (1 - Math.exp(-dt * 16))
      if (target >= 1 && p > 0.992) p = 1

      const typed = (clamp(p / TYPE_END) * WORD.length)
      chars.current.forEach((c, i) => {
        if (!c) return
        const a = clamp(typed - i)
        c.style.opacity = a.toFixed(2)
      })
      const n = Math.min(WORD.length, Math.floor(typed + 0.5))
      const end = n > 0 ? ends[n - 1] : 0
      const flying = clamp((p - FLY_START) / (1 - FLY_START))
      if (caret.current) {
        caret.current.style.transform = `translate3d(${end + 3}px,0,0)`
        caret.current.style.opacity = flying > 0 ? '0' : ''
      }
      if (hint.current) hint.current.style.opacity = p > PAUSE_AT * 0.8 && p < FLY_START ? '1' : '0'

      const mark = document.querySelector<HTMLElement>('[data-wordmark="true"]')
      const brand = document.querySelector<HTMLElement>('.brand')
      if (word.current && mark && base) {
        const to = mark.getBoundingClientRect()
        const e = easeInOut(flying)
        const s = 1 + (to.width / base.width - 1) * e
        const dx = (to.left - base.left) * e
        const dy = (to.top + to.height / 2 - (base.top + (base.height * (to.width / base.width)) / 2)) * e
        word.current.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(${s.toFixed(4)})`
        const landed = clamp((flying - 0.86) / 0.14)
        word.current.style.opacity = (1 - landed).toFixed(3)
        if (brand) brand.style.opacity = landed.toFixed(3)
      }
      if (!ignited && p > IGNITE) {
        ignited = true
        engine.releaseIntro()
        engine.setPageAlpha(1)
        enter()
      }
      if (p >= 1) {
        if (brand) brand.style.opacity = ''
        finish()
      }
    })

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', measure, { passive: true })
    document.fonts?.load('500 60px "HarmonyOS Sans"', WORD).then(measure, measure)
    return () => {
      off()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', measure)
      engine.releaseIntro()
      engine.setPageAlpha(1)
      enter()
    }
  }, [play, blocked])

  if (!play || blocked) return null
  return (
    <div className="splash" ref={root} aria-hidden="true">
      <div className="splash__word" ref={word}>
        {Array.from(WORD).map((c, i) => (
          <span
            key={i}
            ref={(el) => {
              chars.current[i] = el
            }}
          >
            {c === ' ' ? ' ' : c}
          </span>
        ))}
        <i ref={caret} />
      </div>
      <p className="splash__hint" ref={hint}>
        <span className="for-mouse">{t.intro.hintMouse}</span>
        <span className="for-touch">{t.intro.hintTouch}</span>
      </p>
    </div>
  )
}
