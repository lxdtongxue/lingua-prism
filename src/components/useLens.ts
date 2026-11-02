import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { engine, Spring } from '../gl/engine'

const DRAG_PX = 6

// Slides a glass lens onto the active tab. It stretches with its own speed, follows
// layout changes, and can be dragged: the tab under the lens is picked as it passes.
export function useLens(lens: RefObject<HTMLElement | null>, tabs: RefObject<(HTMLElement | null)[]>, active: number, onPick?: (i: number) => void) {
  const x = useRef(new Spring(0, 210, 22))
  const w = useRef(new Spring(0, 210, 22))
  const current = useRef(active)
  const pick = useRef(onPick)
  const drag = useRef<{ id: number; startX: number; startY: number; at: number; moved: boolean; v: number; lastX: number; lastT: number } | null>(null)

  const measure = (snap = false) => {
    const tab = tabs.current[current.current]
    if (!tab || drag.current?.moved) return
    x.current.target = tab.offsetLeft
    w.current.target = tab.offsetWidth
    if (!snap && !engine.reduced) return
    x.current.x = x.current.target
    w.current.x = w.current.target
    x.current.v = 0
    w.current.v = 0
  }

  useLayoutEffect(() => {
    pick.current = onPick
  })

  useLayoutEffect(() => {
    current.current = active
    measure()
    // `measure` only reads refs, so a stale copy is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useLayoutEffect(() => {
    measure(true)
    const row = tabs.current[0]?.parentElement
    if (!row) return
    const ro = new ResizeObserver(() => measure(true))
    ro.observe(row)

    const down = (e: PointerEvent) => {
      if (!pick.current || e.button > 0) return
      drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, at: 0, moved: false, v: 0, lastX: e.clientX, lastT: e.timeStamp }
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const dx = e.clientX - d.startX
      if (!d.moved) {
        if (Math.abs(dx) < DRAG_PX) return
        if (Math.abs(e.clientY - d.startY) > Math.abs(dx)) {
          drag.current = null
          return
        }
        d.moved = true
        row.setPointerCapture(e.pointerId)
      }
      d.at = e.clientX - row.getBoundingClientRect().left
      d.v = ((e.clientX - d.lastX) / Math.max(1, e.timeStamp - d.lastT)) * 1000
      d.lastX = e.clientX
      d.lastT = e.timeStamp
      let best = current.current
      let gap = Infinity
      tabs.current.forEach((t, i) => {
        if (!t) return
        const g = Math.abs(t.offsetLeft + t.offsetWidth / 2 - d.at)
        if (g < gap) {
          gap = g
          best = i
        }
      })
      if (best !== current.current) {
        current.current = best
        pick.current?.(best)
      }
    }
    const up = (e: PointerEvent) => {
      if (drag.current?.id !== e.pointerId) return
      drag.current = null
      measure()
    }
    row.addEventListener('pointerdown', down, { passive: true })
    row.addEventListener('pointermove', move, { passive: true })
    row.addEventListener('pointerup', up, { passive: true })
    row.addEventListener('pointercancel', up, { passive: true })
    return () => {
      ro.disconnect()
      row.removeEventListener('pointerdown', down)
      row.removeEventListener('pointermove', move)
      row.removeEventListener('pointerup', up)
      row.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(
    () =>
      engine.onFrame((dt) => {
        const d = drag.current
        if (d?.moved) {
          const first = tabs.current[0]
          const last = tabs.current[tabs.current.length - 1]
          const tab = tabs.current[current.current]
          if (first && last && tab) {
            w.current.target = tab.offsetWidth
            x.current.x = x.current.target = Math.max(first.offsetLeft, Math.min(last.offsetLeft + last.offsetWidth - w.current.x, d.at - w.current.x / 2))
            x.current.v = d.v * 0.5
            d.v *= 0.8
          }
        } else x.current.step(dt)
        w.current.step(dt)
        const el = lens.current
        if (!el) return
        const stretch = Math.min(Math.abs(x.current.v) / 3000, 0.3)
        el.style.width = `${w.current.x.toFixed(2)}px`
        el.style.transform = `translate3d(${x.current.x.toFixed(2)}px,0,0) scale(${(1 + stretch).toFixed(3)},${(1 - stretch * 0.5).toFixed(3)})`
      }),
    [lens, tabs],
  )
}
