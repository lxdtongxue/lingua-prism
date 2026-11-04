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
  const dismiss = useRef(onClose)

  useLayoutEffect(() => { dismiss.current = onClose }, [onClose])

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
  }, [open])

  useEffect(() => {
    if (!open || !mounted) return
    setBackdrop(1)
    close.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      const sheet = pane.current?.closest('.sheet')
      const sheets = document.querySelectorAll('#sheets > .sheet:not([inert])')
      if (sheet !== sheets[sheets.length - 1]) return
      if (e.key === 'Escape') {
        e.preventDefault()
        dismiss.current()
      } else if (e.key === 'Tab') {
        const items = [...(pane.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]') ?? [])]
          .filter(el => el.tabIndex >= 0 && !el.matches(':disabled, [aria-disabled="true"]') && el.getClientRects().length > 0)
        const first = items[0]
        const last = items.at(-1)
        if (first && last && (!pane.current?.contains(document.activeElement) || (e.shiftKey ? document.activeElement === first : document.activeElement === last))) {
          e.preventDefault()
          ;(e.shiftKey ? last : first).focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      setBackdrop(-1)
      window.removeEventListener('keydown', onKey)
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus({ preventScroll: true })
    }
  }, [open, mounted])

  const root = document.getElementById('sheets')
  if (!mounted || !root) return null
  return createPortal(
    <div className={`sheet${tone ? ` tone-${tone}` : ''}`} role="dialog" aria-modal="true" aria-label={title} inert={!open} onClick={(e) => e.target === e.currentTarget && onClose()}>
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
