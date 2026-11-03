import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import { engine, Spring } from '../gl/engine'
import { GROUPS, pager, setDockMin, setPage, setSectionUrl } from './pager'

const LOCK_PX = 8
const FOLD_PX = 56
const FLICK = 0.35 // px per ms
const SWIPE = 0.22 // share of the screen
const FRICTION = 2.6 // velocity decay per second
const REST_V = 14 // px per s
const RUBBER = 0.36
const STALE_MS = 90 // a finger held still before lifting throws nothing

export const usePagerState = () => {
  const enabled = useSyncExternalStore(pager.subscribe, () => pager.enabled)
  const page = useSyncExternalStore(pager.subscribe, () => pager.page)
  return { enabled, page }
}

// Touch only: a sideways drag pages, a vertical one scrolls the tab. Both move in
// the engine's frame, so glass and DOM can't drift apart. Native scrolling can't do
// that: it runs off the main thread and the WebGL glass trails it by a frame or two.
export function usePagerGesture(track: RefObject<HTMLElement | null>) {
  const { enabled, page } = usePagerState()
  const drag = useRef<{ id: number; x: number; y: number; start: number; lastX: number; lastY: number; lastT: number; v: number; locked: boolean; sideways: boolean; top: number; vertical: boolean } | null>(null)
  const roll = useRef({ page: null as HTMLElement | null, want: 0, v: 0, held: false, over: new Spring(0, 170, 26) })

  useEffect(
    () =>
      engine.onFrame((dt) => {
        const el = track.current
        if (!el) return
        if (!pager.enabled) {
          if (el.style.transform) el.style.transform = ''
          return
        }
        const r = roll.current
        if (r.page) {
          const max = r.page.scrollHeight - r.page.clientHeight
          if (!r.held) {
            r.want += r.v * dt
            r.v *= Math.exp(-FRICTION * dt)
          }
          const y = Math.max(0, Math.min(max, r.want))
          if (r.held) r.over.x = r.over.target = (r.want - y) * RUBBER
          else {
            if (r.want !== y) {
              r.over.v += r.v * RUBBER * 0.3
              r.v = 0
              r.want = y
            }
            r.over.step(dt)
          }
          r.page.scrollTop = y
          const moved = Math.abs(r.over.x) > 0.1 || !r.over.resting
          r.page.style.transform = moved ? `translate3d(0,${(-r.over.x).toFixed(2)}px,0)` : ''
          if (!r.held && !moved && Math.abs(r.v) < REST_V) {
            r.over.x = r.over.v = 0
            r.page = null
          }
        }
        if (!drag.current?.locked || drag.current.vertical) pager.pos.step(dt)
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
      if (!pager.enabled || e.pointerType === 'mouse' || (e.target as Element).closest('.slider__hit')) return
      const r = roll.current
      r.v = 0
      drag.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        start: pager.pos.x,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: e.timeStamp,
        v: 0,
        locked: false,
        sideways: !(e.target as Element).closest('.rail__tabs, .seg'),
        top: 0,
        vertical: false,
      }
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.locked) {
        if (Math.hypot(dx, dy) < LOCK_PX) return
        if (Math.abs(dx) < Math.abs(dy) * 1.1) {
          const page = (e.target as Element).closest<HTMLElement>('.tabpage')
          if (!page || !matchMedia('(pointer: coarse)').matches) {
            drag.current = null
            return
          }
          const r = roll.current
          if (r.page && r.page !== page) r.page.style.transform = ''
          r.page = page
          r.held = true
          r.want = page.scrollTop + r.over.x / RUBBER
          d.top = r.want
          d.y = e.clientY
          d.lastY = e.clientY
          d.lastT = e.timeStamp
          d.v = 0
          d.vertical = d.locked = true
          el.setPointerCapture(e.pointerId)
          return
        }
        if (!d.sideways) {
          drag.current = null
          return
        }
        d.locked = true
        pager.pos.v = 0
        el.setPointerCapture(e.pointerId)
      }
      if (d.vertical) {
        const gap = Math.max(1, e.timeStamp - d.lastT)
        d.v = d.v * 0.6 + ((e.clientY - d.lastY) / gap) * 0.4
        d.lastY = e.clientY
        d.lastT = e.timeStamp
        roll.current.want = d.top - dy
        return
      }
      const last = GROUPS.length - 1
      let p = d.start - dx / window.innerWidth
      if (p < 0) p *= 0.3
      if (p > last) p = last + (p - last) * 0.3
      pager.pos.x = pager.pos.target = p
      const gap = Math.max(1, e.timeStamp - d.lastT)
      d.v = d.v * 0.6 + ((e.clientX - d.lastX) / gap) * 0.4
      d.lastX = e.clientX
      d.lastT = e.timeStamp
      if (Math.round(d.start) === 0 && document.getElementById('hero')) engine.setSteer(dx / (window.innerWidth * 0.42))
    }
    const up = (e: PointerEvent) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      drag.current = null
      if (!d.locked) return
      if (d.vertical) {
        const r = roll.current
        r.held = false
        r.v = e.type === 'pointercancel' || e.timeStamp - d.lastT > STALE_MS ? 0 : -d.v * 1000
        r.over.target = 0
        r.over.v = 0
        return
      }
      engine.setSteer(0)
      const dx = e.clientX - d.x
      const from = Math.round(d.start)
      const turn = e.type === 'pointercancel' ? 0 : dx < -window.innerWidth * SWIPE || d.v < -FLICK ? 1 : dx > window.innerWidth * SWIPE || d.v > FLICK ? -1 : 0
      pager.pos.v = (-d.v * 1000) / window.innerWidth
      setPage(from + turn)
      const id = GROUPS[pager.page][0]
      setSectionUrl(id)
    }
    const key = (e: KeyboardEvent) => {
      if (!pager.enabled || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
      if ((e.target as Element).closest('[role=tablist],[role=slider]')) return
      setPage(pager.page + (e.key === 'ArrowRight' ? 1 : -1))
      setSectionUrl(GROUPS[pager.page][0])
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
      if (done || !pager.enabled || (e.target as Element).closest('.sheet, .dockbar')) return
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
