import { useEffect, useRef } from 'react'
import { engine } from '../gl/engine'

const $ = (id: string) => document.getElementById(id)

// The canvas lives in document flow so native (async) scrolling carries it along
// with the DOM. Each frame the engine repositions it, which is what keeps the
// glass glued to its elements on phones.
export function Stage() {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    engine.setPools([
      { el: $('hero'), page: 0, x: 0.74, dy: 0.42, r: 0.5, a: 0.18, c: [0.3, 0.45, 0.95] },
      { el: $('test'), page: 1, x: 0.2, dy: 0.5, r: 0.68, a: 0.44, c: [0.12, 0.72, 0.8] },
      { el: $('lab'), page: 1, x: 0.78, dy: 0.48, r: 0.72, a: 0.42, c: [1, 0.46, 0.2] },
      { el: $('framework'), page: 2, x: 0.12, dy: 0.55, r: 0.62, a: 0.46, c: [0.16, 0.5, 1] },
      { el: $('spectrum'), page: 2, x: 0.72, dy: 0.55, r: 0.74, a: 0.42, c: [0.25, 0.72, 1] },
      { el: $('aptitude'), page: 2, x: 0.2, dy: 0.3, r: 0.76, a: 0.5, c: [0.5, 0.3, 1] },
      { el: $('roadmap'), page: 3, x: 0.25, dy: 0.5, r: 0.72, a: 0.42, c: [0.1, 0.8, 0.55] },
      { el: $('references'), page: 4, x: 0.7, dy: 0.5, r: 0.7, a: 0.36, c: [0.75, 0.3, 0.6] },
    ])
    engine.mount(stage.current!, canvas.current!)
    return () => engine.unmount()
  }, [])

  return (
    <div className="stage" ref={stage} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  )
}
