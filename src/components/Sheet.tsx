import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { engine } from '../gl/engine'
import { Glass } from './Glass'
import { useI18n } from './i18n'

const CLOSE_MS = 320
let openCount = 0

function setBackdrop(delta: number) {
  openCount += delta
  document.documentElement.classList.toggle('sheet-open', openCount > 0)
  engine.setPageAlpha(openCount > 0 ? 0 : 1)
}

type Props = { open: boolean; onClose: () => void; kicker?: string; title: string; tone?: string; fill?: boolean; children: ReactNode }

// Second level of the content. The page fades away so the sheet is real glass on
// the canvas rather than a blur over DOM.
export function Sheet({ open, onClose, kicker, title, tone, fill, children }: Props) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(open)
  const pane = useRef<HTMLElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const returnTo = useRef<Element | null>(null)
  const drag = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (open) {
      returnTo.current = document.activeElement
      setMounted(true)
      return
    }
    if (!mounted || !pane.current) return
    engine.dismiss(pane.current)
    const id = window.setTimeout(() => setMounted(false), CLOSE_MS)
    return () => window.clearTimeout(id)
  }, [open, mounted])

  useEffect(() => {
    if (!open) return
    setBackdrop(1)
    close.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      setBackdrop(-1)
      window.removeEventListener('keydown', onKey)
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus({ preventScroll: true })
    }
  }, [open, onClose])

  const root = document.getElementById('sheets')
  if (!mounted || !root) return null
  return createPortal(
    <div className={`sheet${tone ? ` tone-${tone}` : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Glass className={`sheet__pane${fill ? ' sheet__pane--fill' : ''}`} radius={34} bevel={22} depth={1.5} frost={0.2} dim={0.2} shadow={0.8} layer={2} force elRef={pane}>
        <header
          className="sheet__head"
          onPointerDown={(e) => {
            drag.current = e.clientY
          }}
          onPointerUp={(e) => {
            if (drag.current !== null && e.clientY - drag.current > 70) onClose()
            drag.current = null
          }}
        >
          <div>
            {kicker && <p className="micro">{kicker}</p>}
            <h3>{title}</h3>
          </div>
          <button className="sheet__close" ref={close} onClick={onClose} aria-label={t.close}>
            <X size={18} strokeWidth={2} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
      </Glass>
    </div>,
    root,
  )
}
