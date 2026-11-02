import { useRef } from 'react'
import { Glass } from './Glass'
import { useLens } from './useLens'

// A row of options with a draggable glass lens.
export function Seg({ labels, active, onPick, label }: { labels: string[]; active: number; onPick: (i: number) => void; label: string }) {
  const lens = useRef<HTMLElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  useLens(lens, tabs, active, onPick)
  return (
    <div className="seg" role="group" aria-label={label}>
      <Glass className="seg__lens" radius={999} bevel={20} depth={1.2} frost={0.15} dim={0} tint={[1, 1, 1, 0.085]} shadow={0.45} reveal={false} layer={3} elRef={lens} aria-hidden="true" />
      {labels.map((text, i) => (
        <button
          key={text}
          type="button"
          ref={(el) => {
            tabs.current[i] = el
          }}
          className="seg__btn"
          aria-pressed={active === i}
          onClick={() => onPick(i)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
