import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { engine, Spring } from '../gl/engine'

// Slides a glass lens onto the active tab. It stretches with its own speed, and
// follows layout changes so it can never drift from the selected tab.
export function useLens(lens: RefObject<HTMLElement | null>, tabs: RefObject<(HTMLElement | null)[]>, active: number) {
  const x = useRef(new Spring(0, 210, 22))
  const w = useRef(new Spring(0, 210, 22))
  const current = useRef(active)

  const measure = (snap = false) => {
    const tab = tabs.current[current.current]
    if (!tab) return
    x.current.target = tab.offsetLeft
    w.current.target = tab.offsetWidth
    if (!snap && !engine.reduced) return
    x.current.x = x.current.target
    w.current.x = w.current.target
    x.current.v = 0
    w.current.v = 0
  }

  useLayoutEffect(() => {
    current.current = active
    measure()
    // `measure` only reads refs, so a stale copy is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useLayoutEffect(() => {
    measure(true)
    const onResize = () => measure(true)
    const ro = new ResizeObserver(onResize)
    const row = tabs.current[0]?.parentElement
    if (row) ro.observe(row)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(
    () =>
      engine.onFrame((dt) => {
        x.current.step(dt)
        w.current.step(dt)
        const el = lens.current
        if (!el) return
        const stretch = Math.min(Math.abs(x.current.v) / 3000, 0.3)
        el.style.width = `${w.current.x.toFixed(2)}px`
        el.style.transform = `translate3d(${x.current.x.toFixed(2)}px,0,0) scale(${(1 + stretch).toFixed(3)},${(1 - stretch * 0.5).toFixed(3)})`
      }),
    [lens],
  )
}
