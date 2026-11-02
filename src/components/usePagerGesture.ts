import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import { engine } from '../gl/engine'
import { PAGES, pager, setDockMin, setPage } from './pager'

const LOCK_PX = 8
const FOLD_PX = 56
const FLICK = 0.35 // px per ms
const SWIPE = 0.22 // share of the screen

export const usePagerState = () => {
  const enabled = useSyncExternalStore(pager.subscribe, () => pager.enabled)
  const page = useSyncExternalStore(pager.subscribe, () => pager.page)
  return { enabled, page }
}

// Touch only: a sideways drag pages, a vertical one stays native. The track moves
// in the engine's frame, so glass and DOM can't drift apart mid-swipe.
export function usePagerGesture(track: RefObject<HTMLElement | null>) {
  const { enabled, page } = usePagerState()
  const drag = useRef<{ id: number; x: number; y: number; start: number; lastX: number; lastT: number; v: number; locked: boolean } | null>(null)

  useEffect(
    () =>
      engine.onFrame((dt) => {
        const el = track.current
        if (!el) return
        if (!pager.enabled) {
          if (el.style.transform) el.style.transform = ''
          return
        }
        if (!drag.current?.locked) pager.pos.step(dt)
        engine.setPage(pager.pos.x)
        el.style.transform = `translate3d(${(-pager.pos.x * window.innerWidth).toFixed(2)}px,0,0)`
      }),
    [track],
  )

  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    Array.from(el.children).forEach((c, i) => {
      ;(c as HTMLElement).inert = enabled && i !== page
    })
  }, [track, enabled, page])

  useEffect(() => {
    const el = track.current
    if (!el) return
    const down = (e: PointerEvent) => {
      if (!pager.enabled || e.pointerType === 'mouse' || (e.target as Element).closest('.slider__hit, .rail__tabs, .seg')) return
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: pager.pos.x, lastX: e.clientX, lastT: e.timeStamp, v: 0, locked: false }
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.locked) {
        if (Math.hypot(dx, dy) < LOCK_PX) return
        if (Math.abs(dx) < Math.abs(dy) * 1.1) {
          drag.current = null
          return
        }
        d.locked = true
        pager.pos.v = 0
        el.setPointerCapture(e.pointerId)
      }
      const last = PAGES.length - 1
      let p = d.start - dx / window.innerWidth
      if (p < 0) p *= 0.3
      if (p > last) p = last + (p - last) * 0.3
      pager.pos.x = pager.pos.target = p
      const gap = Math.max(1, e.timeStamp - d.lastT)
      d.v = d.v * 0.6 + ((e.clientX - d.lastX) / gap) * 0.4
      d.lastX = e.clientX
      d.lastT = e.timeStamp
      if (Math.round(d.start) === 0) engine.setSteer(dx / (window.innerWidth * 0.42))
    }
    const up = (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      drag.current = null
      if (!d.locked) return
      engine.setSteer(0)
      const dx = e.clientX - d.x
      const from = Math.round(d.start)
      const turn = e.type === 'pointercancel' ? 0 : dx < -window.innerWidth * SWIPE || d.v < -FLICK ? 1 : dx > window.innerWidth * SWIPE || d.v > FLICK ? -1 : 0
      pager.pos.v = (-d.v * 1000) / window.innerWidth
      setPage(from + turn)
      const id = PAGES[pager.page]
      history.replaceState(null, '', pager.page ? `#${id}` : location.pathname + location.search)
    }
    const key = (e: KeyboardEvent) => {
      if (!pager.enabled || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
      if ((e.target as Element).closest('[role=tablist],[role=slider]')) return
      setPage(pager.page + (e.key === 'ArrowRight' ? 1 : -1))
    }
    // Only a real vertical swipe folds the tab bar; a tap with a slight wobble must not.
    let startX = 0
    let startY = 0
    let done = false
    const touchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      done = false
    }
    const fold = (e: TouchEvent, t: Touch) => {
      if (done || !pager.enabled || (e.target as Element).closest('.sheet, .dock')) return
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      if (Math.abs(dy) < FOLD_PX || Math.abs(dy) < Math.abs(dx) * 1.5) return
      done = true
      setDockMin(dy < 0)
    }
    const touchMove = (e: TouchEvent) => fold(e, e.touches[0])
    // Browsers may thin out touchmove during a pan, so the lift gets a say too.
    const touchEnd = (e: TouchEvent) => fold(e, e.changedTouches[0])
    window.addEventListener('touchstart', touchStart, { passive: true })
    window.addEventListener('touchmove', touchMove, { passive: true })
    window.addEventListener('touchend', touchEnd, { passive: true })
    el.addEventListener('pointerdown', down, { passive: true })
    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerup', up, { passive: true })
    el.addEventListener('pointercancel', up, { passive: true })
    window.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', key)
      window.removeEventListener('touchstart', touchStart)
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('touchend', touchEnd)
    }
  }, [track])
}
