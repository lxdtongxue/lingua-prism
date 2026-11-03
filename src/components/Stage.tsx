import { useEffect, useRef } from 'react'
import { engine } from '../gl/engine'
import { groupOf } from './pager'

const $ = (id: string) => document.getElementById(id)

// The canvas lives in document flow so native (async) scrolling carries it along
// with the DOM. Each frame the engine repositions it, which is what keeps the
// glass glued to its elements on phones.
export function Stage() {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Each section lights its own patch of the scene; sections on the other page don't exist here.
    const pools: { id: string; x: number; dy: number; r: number; a: number; c: [number, number, number] }[] = [
      { id: 'hero', x: 0.74, dy: 0.42, r: 0.5, a: 0.18, c: [0.3, 0.45, 0.95] },
      { id: 'test', x: 0.2, dy: 0.5, r: 0.68, a: 0.44, c: [0.12, 0.72, 0.8] },
      { id: 'lab', x: 0.78, dy: 0.48, r: 0.72, a: 0.42, c: [1, 0.46, 0.2] },
      { id: 'framework', x: 0.12, dy: 0.55, r: 0.62, a: 0.46, c: [0.16, 0.5, 1] },
      { id: 'spectrum', x: 0.72, dy: 0.55, r: 0.74, a: 0.42, c: [0.25, 0.72, 1] },
      { id: 'aptitude', x: 0.2, dy: 0.3, r: 0.76, a: 0.5, c: [0.5, 0.3, 1] },
      { id: 'roadmap', x: 0.25, dy: 0.5, r: 0.72, a: 0.42, c: [0.1, 0.8, 0.55] },
      { id: 'references', x: 0.7, dy: 0.5, r: 0.7, a: 0.36, c: [0.75, 0.3, 0.6] },
    ]
    engine.setPools(pools.filter((p) => groupOf(p.id) >= 0).map(({ id, ...p }) => ({ el: $(id), page: groupOf(id), ...p })))
    engine.mount(stage.current!, canvas.current!)
    return () => engine.unmount()
  }, [])

  return (
    <div className="stage" ref={stage} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  )
}
