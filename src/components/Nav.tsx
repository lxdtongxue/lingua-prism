import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { engine, Spring } from '../gl/engine'
import { BookOpen, FlaskConical, Layers, Target, Triangle } from 'lucide-react'
import { useI18n } from './i18n'
import { goTo, groupOf, pager, SECTIONS, setDockMin, setPage } from './pager'
import { usePagerState } from './usePagerGesture'

// Each tab groups one or more pages and opens on the first of them.
const TABS = [
  { id: 'test', icon: FlaskConical, pages: ['test', 'lab'] },
  { id: 'about', icon: Layers, pages: ['framework', 'spectrum', 'aptitude'] },
  { id: 'goals', icon: Target, pages: ['roadmap'] },
  { id: 'refs', icon: BookOpen, pages: ['references'] },
] as const
const IDS = SECTIONS.filter((id) => id !== 'hero')
const tabOf = (id: string) => TABS.findIndex((t) => (t.pages as readonly string[]).includes(id))
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const FOLD_SCROLL = 48
const DRAG_PX = 6
const ICON_W = 50
const LANG_SWAP_MS = 290

export function Nav() {
  const { t, lang, setLang } = useI18n()
  const [scrolled, setActive] = useState(-1)
  const { enabled, page } = usePagerState()
  const active = enabled ? page - 1 : scrolled
  const dock = useRef<HTMLElement>(null)
  const drop = useRef<HTMLSpanElement>(null)
  const home = useRef<HTMLSpanElement>(null)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  const x = useRef(new Spring(0, 240, 25))
  const w = useRef(new Spring(0, 240, 25))
  const shown = useRef(new Spring(0, 200, 26))
  const min = useRef(new Spring(0, 150, 24))
  const keeps = useRef(TABS.map(() => new Spring(0, 200, 26)))
  const keepHome = useRef(new Spring(1, 200, 26))
  const natural = useRef<number[]>([])
  const current = useRef(active)
  const drag = useRef<{ id: number; startX: number; at: number; pick: number; moved: boolean } | null>(null)

  useEffect(() => {
    const seen = new Map<string, number>()
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0)
        let best = ''
        let top = 0
        IDS.forEach((id) => {
          const v = seen.get(id) ?? 0
          if (v > top) {
            top = v
            best = id
          }
        })
        setActive(best ? tabOf(best) : -1)
      },
      { rootMargin: '-46% 0px -46% 0px', threshold: [0, 0.01, 0.5, 1] },
    )
    IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  // The fold animates widths, so it needs each tab's open width from a clean layout.
  useLayoutEffect(() => {
    const measure = () => {
      const el = dock.current
      if (!el) return
      el.style.setProperty('--m', '0')
      links.current.forEach((a) => {
        if (a) a.style.width = ''
      })
      natural.current = links.current.map((a) => a?.offsetWidth ?? 0)
      el.dataset.m = ''
    }
    measure()
    document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [lang])

  useLayoutEffect(() => {
    current.current = active
    const a = links.current[active]
    shown.current.target = a ? 1 : 0
    if (a && shown.current.x < 0.02) {
      x.current.x = a.offsetLeft
      w.current.x = a.offsetWidth
    }
  }, [active, lang])

  // Folding runs on springs in the frame loop, so it can reverse halfway without a jump.
  const fold = (dt: number) => {
    const el = dock.current
    if (!el) return
    const m = min.current
    m.target = pager.dockMin ? 1 : 0
    keepHome.current.target = current.current < 0 ? 1 : 0
    keeps.current.forEach((s, i) => {
      s.target = current.current === i ? 1 : 0
    })
    for (const s of [m, keepHome.current, ...keeps.current]) {
      s.step(dt)
      if (engine.reduced) s.x = s.target
    }
    const e = clamp01(m.x)
    const stamp = [e, keepHome.current.x, ...keeps.current.map((s) => s.x)].map((v) => v.toFixed(3)).join()
    if (el.dataset.m === stamp) return
    el.dataset.m = stamp
    el.style.setProperty('--m', e.toFixed(3))
    links.current.forEach((a, i) => {
      if (!a) return
      const keep = clamp01(keeps.current[i].x)
      a.style.width = `${((natural.current[i] ?? 0) * (1 - e) + ICON_W * keep * e).toFixed(2)}px`
      a.style.opacity = (1 - e + keep * e).toFixed(3)
    })
    if (home.current) home.current.style.width = `${(ICON_W * e * clamp01(keepHome.current.x)).toFixed(2)}px`
    const left = brand.current?.offsetLeft ?? 0
    const centre = window.innerWidth / 2
    el.style.transform = `translate3d(${(centre + (left + 30 - centre) * e).toFixed(2)}px,0,0) translateX(-50%)`
  }

  // The droplet slides on a spring and stretches with its own speed. It reads the
  // active tab every frame, so it stays on it while the bar folds and unfolds.
  useEffect(
    () =>
      engine.onFrame((dt) => {
        fold(dt)
        const d = drag.current
        const nowAt = links.current[current.current]
        if (d?.moved) {
          const first = links.current[0]
          const last = links.current[TABS.length - 1]
          const tab = links.current[d.pick]
          if (first && last && tab) {
            w.current.target = tab.offsetWidth
            const next = Math.max(first.offsetLeft, Math.min(last.offsetLeft + last.offsetWidth - w.current.x, d.at - w.current.x / 2))
            x.current.v = (next - x.current.x) / Math.max(dt, 1 / 120)
            x.current.x = x.current.target = next
            shown.current.target = 1
          }
        } else if (pager.enabled && !pager.dockMin) {
          // The droplet tracks the finger between tabs while a page is dragged.
          const f = Math.max(0, Math.min(TABS.length - 1, pager.pos.x - 1))
          const i = Math.min(TABS.length - 2, Math.floor(f))
          const from = links.current[i]
          const to = links.current[i + 1]
          if (from && to) {
            const m = f - i
            x.current.target = x.current.x = from.offsetLeft + (to.offsetLeft - from.offsetLeft) * m
            w.current.target = w.current.x = from.offsetWidth + (to.offsetWidth - from.offsetWidth) * m
            x.current.v = pager.pos.v * (to.offsetLeft - from.offsetLeft)
            shown.current.target = shown.current.x = clamp01(pager.pos.x)
          }
        } else if (nowAt) {
          x.current.target = nowAt.offsetLeft
          w.current.target = nowAt.offsetWidth
          // The tabs are moving under it while the bar folds, so a spring would trail.
          if (pager.enabled) {
            x.current.x = x.current.target
            w.current.x = w.current.target
            x.current.v = 0
          }
        }
        if (!d?.moved) x.current.step(dt)
        w.current.step(dt)
        shown.current.step(dt)
        const el = drop.current
        if (!el) return
        const stretch = Math.min(Math.abs(x.current.v) / 2600, 0.34)
        el.style.width = `${w.current.x.toFixed(1)}px`
        el.style.transform = `translate3d(${x.current.x.toFixed(2)}px,0,0) scale(${(1 + stretch).toFixed(3)},${(1 - stretch * 0.42).toFixed(3)})`
        el.style.opacity = clamp01(shown.current.x).toFixed(3)
      }),
    [],
  )

  // A deliberate scroll down tucks the tab bar into one round icon. It reopens on a
  // click or a scroll back up, never on hover.
  useEffect(() => {
    const seen = new WeakMap<object, number>()
    let travel = 0
    const onScroll = (e: Event) => {
      const t = e.target === document ? document.documentElement : (e.target as HTMLElement)
      if (t.closest?.('.sheet')) return
      const y = t.scrollTop
      const d = y - (seen.get(t) ?? 0)
      seen.set(t, y)
      if (y < 12) {
        travel = 0
        setDockMin(false)
        return
      }
      if (performance.now() < pager.navUntil) {
        travel = 0
        return
      }
      travel = d > 0 === travel > 0 ? travel + d : d
      if (Math.abs(travel) > FOLD_SCROLL) setDockMin(travel > 0)
    }
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  // The title drifts to centre on the way down and the language switch dissolves.
  const brand = useRef<HTMLAnchorElement>(null)
  const lang2 = useRef<HTMLButtonElement>(null)
  const titleFold = useRef(new Spring(0, 90, 19))
  useEffect(
    () =>
      engine.onFrame((dt) => {
        titleFold.current.target = pager.enabled ? Math.max(clamp01(pager.pos.x), pager.dockMin ? 1 : 0) : clamp01(window.scrollY / 280)
        titleFold.current.step(dt)
        const c = clamp01(titleFold.current.x)
        const b = brand.current
        const l = lang2.current
        if (b) {
          const left = b.offsetLeft
          b.style.transform = `translate3d(${((window.innerWidth - b.offsetWidth) / 2 - left) * c}px,0,0)`
        }
        if (l) {
          l.style.setProperty('--c', c.toFixed(3))
          l.style.setProperty('--glow', Math.sin(c * Math.PI).toFixed(3))
          l.style.visibility = c > 0.98 ? 'hidden' : ''
        }
      }),
    [],
  )

  // The droplet can also be dragged along the bar.
  const onDockDown = (e: PointerEvent) => {
    if (pager.dockMin || e.button > 0) return
    drag.current = { id: e.pointerId, startX: e.clientX, at: 0, pick: Math.max(0, current.current), moved: false }
  }
  const onDockMove = (e: PointerEvent) => {
    const d = drag.current
    const el = dock.current
    if (!d || !el || d.id !== e.pointerId) return
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < DRAG_PX) return
      d.moved = true
      el.setPointerCapture(e.pointerId)
    }
    d.at = e.clientX - el.getBoundingClientRect().left
    let gap = Infinity
    links.current.forEach((a, i) => {
      if (!a) return
      const g = Math.abs(a.offsetLeft + a.offsetWidth / 2 - d.at)
      if (g < gap) {
        gap = g
        if (i !== d.pick) {
          d.pick = i
          if (pager.enabled) setPage(groupOf(TABS[i].pages[0]))
        }
      }
    })
  }
  const onDockUp = (e: PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (d.moved) goTo(TABS[d.pick].pages[0])
  }

  const go = (e: MouseEvent, id: string) => {
    e.preventDefault()
    goTo(id)
    if (!pager.enabled) history.replaceState(null, '', `#${id}`)
  }

  // The page dips to black and the language swaps while nothing is visible.
  const switchLang = () => {
    const next = lang === 'zh' ? 'en' : 'zh'
    const box = lang2.current?.getBoundingClientRect()
    if (engine.reduced || !box || document.querySelector('.lang-wipe')) {
      setLang(next)
      return
    }
    const wipe = document.createElement('div')
    wipe.className = 'lang-wipe'
    wipe.style.setProperty('--x', `${box.left + box.width / 2}px`)
    wipe.style.setProperty('--y', `${box.top + box.height / 2}px`)
    document.body.append(wipe)
    window.setTimeout(() => setLang(next), LANG_SWAP_MS)
    wipe.addEventListener('animationend', () => wipe.remove())
  }

  return (
    <>
      <header className="topbar">
        <a className="brand chrome" ref={brand} href="#hero" onClick={(e) => go(e, 'hero')} aria-label={t.brand}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 3.5 21 20H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <span data-wordmark={lang === 'en'}>{t.brand}</span>
          <small data-wordmark={lang === 'zh'}>{t.brandEn}</small>
        </a>
        <button className="chrome lang" ref={lang2} onClick={switchLang} aria-label={t.langLabel}>
          {t.langSwitch}
        </button>
      </header>
      <nav
        className="dock chrome"
        ref={dock}
        aria-label={t.brand}
        onClickCapture={(e) => {
          if (!pager.dockMin) return
          e.preventDefault()
          e.stopPropagation()
          setDockMin(false)
        }}
        onPointerDown={onDockDown}
        onPointerMove={onDockMove}
        onPointerUp={onDockUp}
        onPointerCancel={onDockUp}
      >
        <span className="dock__drop" ref={drop} aria-hidden="true" />
        <span className="dock__home" ref={home} aria-hidden={active >= 0}>
          <Triangle size={20} strokeWidth={1.8} />
        </span>
        {TABS.map(({ id, icon: Icon, pages }, i) => (
          <a
            key={id}
            ref={(el) => {
              links.current[i] = el
            }}
            href={`#${pages[0]}`}
            draggable={false}
            aria-current={active === i ? 'true' : undefined}
            onClick={(e) => go(e, pages[0])}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{t.nav[id]}</span>
          </a>
        ))}
      </nav>
    </>
  )
}
