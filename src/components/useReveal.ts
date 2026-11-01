import { useEffect, useRef, type RefObject } from 'react'

let io: IntersectionObserver | null = null
const shared = () =>
  (io ??= new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io!.unobserve(e.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  ))

// Marks an element `.in` the first time it scrolls into view; CSS does the rest.
export function useReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    shared().observe(el)
    return () => shared().unobserve(el)
  }, [])
  return ref
}
