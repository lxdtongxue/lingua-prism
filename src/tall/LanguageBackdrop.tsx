import { useEffect, useRef } from 'react'
import { drawAtlas } from '../gl/atlas'

// The same six multilingual ribbons as the hero, at half its speed.
// A single canvas avoids running the prism, refraction and blur passes during a test.
export function LanguageBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const g = canvas.getContext('2d')
    if (!g) return
    let atlas = drawAtlas(2048)
    let alive = true
    let frame = 0
    let previous = 0
    let elapsed = 0
    let width = 0
    let height = 0
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const paint = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, width, height)
      const rowH = Math.min(height * .125, width * .13 + 24)
      const ribbon = rowH * 12
      for (let row = 0; row * rowH < height; row++) {
        const dir = row % 2 ? 1 : -1
        const speed = .007 * (1 + ((row * 1.7) % 3) * .35) * .5
        const offset = ((dir * elapsed * speed + row * .37) % 1 + 1) % 1
        const x = -offset * ribbon
        g.drawImage(atlas, 0, (row % 6) * atlas.height / 6, atlas.width, atlas.height / 6, x, row * rowH, ribbon, rowH)
        g.drawImage(atlas, 0, (row % 6) * atlas.height / 6, atlas.width, atlas.height / 6, x + ribbon, row * rowH, ribbon, rowH)
      }
    }
    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      const dpr = Math.min(devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      paint()
    }
    const tick = (now: number) => {
      frame = 0
      if (document.hidden || motion.matches) return
      if (now - previous >= 1000 / 30) {
        elapsed += Math.min((now - previous) / 1000, .1)
        previous = now
        paint()
      }
      frame = requestAnimationFrame(tick)
    }
    const resume = () => {
      cancelAnimationFrame(frame)
      previous = performance.now()
      frame = 0
      if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick)
      else paint()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    resume()
    Promise.allSettled([
      document.fonts.load('500 60px "HarmonyOS Sans"', 'Hello'),
      document.fonts.load('500 60px "HarmonyOS Sans SC"', '你好'),
      document.fonts.load('400 60px "HarmonyOS Sans Naskh Arabic"', 'مرحبا'),
    ]).then(() => {
      if (!alive) return
      atlas = drawAtlas(2048)
      paint()
    })
    document.addEventListener('visibilitychange', resume)
    motion.addEventListener('change', resume)
    return () => {
      alive = false
      cancelAnimationFrame(frame)
      ro.disconnect()
      document.removeEventListener('visibilitychange', resume)
      motion.removeEventListener('change', resume)
    }
  }, [])
  return <div className="exam-backdrop" aria-hidden="true"><canvas ref={ref} /></div>
}
