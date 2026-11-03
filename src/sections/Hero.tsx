import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import { useI18n } from '../components/i18n'
import { Glass } from '../components/Glass'
import { engine } from '../gl/engine'
import { goTo, pager } from '../components/pager'

const at = (d: string) => ({ '--d': d }) as CSSProperties

export function Hero() {
  const { t } = useI18n()
  const h = t.hero
  const prism = useRef<HTMLDivElement>(null)
  const drag = useRef<number | null>(null)

  useEffect(() => {
    engine.heroEl = prism.current
    return () => {
      engine.heroEl = null
    }
  }, [])

  // Touch: a horizontal drag steers the beam. touch-action: pan-y keeps vertical scrolling native.
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' && !pager.enabled) drag.current = e.clientX
  }
  const onMove = (e: PointerEvent) => {
    if (drag.current !== null) engine.setSteer((e.clientX - drag.current) / (window.innerWidth * 0.42))
  }
  const onEnd = () => {
    drag.current = null
    engine.setSteer(0)
  }

  return (
    <section id="hero" className="hero" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}>
      <div className="hero__prism" ref={prism} aria-hidden="true" />
      <div className="wrap hero__inner">
        <p className="eyebrow intro" style={at('1.15s')}>
          {h.eyebrow}
        </p>
        <h1>
          {h.title.map((line, i) => (
            <span className="line" key={i}>
              <span style={at(`${1.25 + i * 0.1}s`)}>{line}</span>
            </span>
          ))}
        </h1>
        <div className="hero__copy">
          <p className="lead intro" style={at('1.55s')}>
            {h.lead}
          </p>
          <div className="hero__cta intro" style={at('1.7s')}>
            <Glass as="button" type="button" className="btn btn--solid" radius={999} bevel={27} depth={0.7} frost={0.3} dim={0} tint={[0.96, 0.97, 1, 0.86]} press reveal={false} onClick={() => goTo('test')}>
              {h.cta1}
            </Glass>
            <Glass as="button" type="button" className="btn" radius={999} bevel={27} depth={1} frost={0.1} dim={0.1} press reveal={false} onClick={() => goTo('framework')}>
              {h.cta2}
            </Glass>
          </div>
          <p className="hero__note intro" style={at('1.78s')}>
            {h.ctaNote}
          </p>
        </div>
        <div className="hero__side intro" style={at('1.85s')}>
          <p className="hero__hint">
            <span className="for-mouse">{h.hintMouse}</span>
            <span className="for-touch">{h.hintTouch}</span>
          </p>
        </div>
      </div>
    </section>
  )
}
