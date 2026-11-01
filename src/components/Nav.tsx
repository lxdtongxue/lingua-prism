import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { engine, Spring } from '../gl/engine'
import { useI18n } from './i18n'

const IDS = ['framework', 'spectrum', 'aptitude', 'lab', 'roadmap'] as const

export function Nav() {
  const { t, lang, setLang } = useI18n()
  const [active, setActive] = useState(-1)
  const dock = useRef<HTMLElement>(null)
  const drop = useRef<HTMLSpanElement>(null)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  const x = useRef(new Spring(0, 240, 25))
  const w = useRef(new Spring(0, 240, 25))
  const shown = useRef(new Spring(0, 200, 26))

  useEffect(() => {
    const seen = new Map<string, number>()
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0)
        let best = -1
        let top = 0
        IDS.forEach((id, i) => {
          const v = seen.get(id) ?? 0
          if (v > top) {
            top = v
            best = i
          }
        })
        setActive(best)
      },
      { rootMargin: '-46% 0px -46% 0px', threshold: [0, 0.01, 0.5, 1] },
    )
    IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  // The droplet slides on a spring and stretches with its own speed.
  useLayoutEffect(() => {
    const place = () => {
      const a = links.current[active]
      if (!a || !dock.current) {
        shown.current.target = 0
        return
      }
      shown.current.target = 1
      x.current.target = a.offsetLeft
      w.current.target = a.offsetWidth
      if (shown.current.x < 0.02) {
        x.current.x = x.current.target
        w.current.x = w.current.target
      }
    }
    place()
    window.addEventListener('resize', place, { passive: true })
    document.fonts?.ready.then(place)
    return () => window.removeEventListener('resize', place)
  }, [active, lang])

  useEffect(
    () =>
      engine.onFrame((dt) => {
        x.current.step(dt)
        w.current.step(dt)
        shown.current.step(dt)
        const el = drop.current
        if (!el) return
        const stretch = Math.min(Math.abs(x.current.v) / 2600, 0.34)
        const s = Math.max(0, Math.min(1, shown.current.x))
        el.style.width = `${w.current.x.toFixed(1)}px`
        el.style.transform = `translate3d(${x.current.x.toFixed(2)}px,0,0) scale(${(1 + stretch).toFixed(3)},${(1 - stretch * 0.42).toFixed(3)})`
        el.style.opacity = s.toFixed(3)
      }),
    [],
  )

  const go = (e: MouseEvent, id: string) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: engine.reduced ? 'auto' : 'smooth' })
    history.replaceState(null, '', `#${id}`)
  }

  return (
    <>
      <header className="topbar">
        <a className="brand chrome" href="#hero" onClick={(e) => go(e, 'hero')} aria-label={t.brand}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 3.5 21 20H3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <span>{t.brand}</span>
          <small>{t.brandEn}</small>
        </a>
        <button className="chrome lang" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label={t.langLabel}>
          {t.langSwitch}
        </button>
      </header>
      <nav className="dock chrome" ref={dock} aria-label={t.brand}>
        <span className="dock__drop" ref={drop} aria-hidden="true" />
        {IDS.map((id, i) => (
          <a
            key={id}
            ref={(el) => {
              links.current[i] = el
            }}
            href={`#${id}`}
            aria-current={active === i ? 'true' : undefined}
            onClick={(e) => go(e, id)}
          >
            {t.nav[id]}
          </a>
        ))}
      </nav>
    </>
  )
}
