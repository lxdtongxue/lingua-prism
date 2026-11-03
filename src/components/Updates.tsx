import { useCallback, useEffect, useRef, useState } from 'react'
import { History, Sparkles, X } from 'lucide-react'
import changelog from '../../CHANGELOG.md?raw'
import { version } from '../../package.json'
import { parseReleaseNotes } from '../content/releaseNotes'
import { useI18n } from './i18n'

export const RELEASE_VERSION = `v${version.replace(/^0\./, '')}`
const releases = parseReleaseNotes(changelog)
const SEEN = 'lingua-prism-seen-release'
export const openUpdates = () => window.dispatchEvent(new Event('lp-updates'))

function unseen() {
  try {
    return localStorage.getItem(SEEN) !== RELEASE_VERSION && sessionStorage.getItem(SEEN) !== RELEASE_VERSION
  } catch {
    return true
  }
}

function remember() {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try { window[name].setItem(SEEN, RELEASE_VERSION) } catch { /* dismiss still works if storage is blocked */ }
  }
}

const inline = (text: string) => text.split(/(`[^`]+`)/).map((s, i) => s.startsWith('`') ? <code key={i}>{s.slice(1, -1)}</code> : s)

export function Updates() {
  const { t } = useI18n()
  const u = t.updates
  const [view, setView] = useState<'overview' | 'history' | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const autoHandled = useRef(false)
  const dismiss = useCallback(() => { remember(); setView(null) }, [])

  useEffect(() => {
    let timer = 0
    const check = () => {
      if (autoHandled.current || !unseen()) return
      const html = document.documentElement
      const ready = html.classList.contains('entered') && !html.classList.contains('intro-on') && !html.classList.contains('sheet-open')
      if (!ready) { window.clearTimeout(timer); timer = 0; return }
      if (timer) return
      timer = window.setTimeout(() => {
        autoHandled.current = true
        setView('overview')
      }, 700)
    }
    const history = () => { autoHandled.current = true; window.clearTimeout(timer); setView('history') }
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('lp-updates', history)
    check()
    return () => { observer.disconnect(); window.clearTimeout(timer); window.removeEventListener('lp-updates', history) }
  }, [])

  useEffect(() => {
    const el = dialog.current!
    if (view) {
      if (!el.open) el.showModal()
      scroll.current?.scrollTo({ top: 0 })
    } else if (el.open) el.close()
  }, [view])

  return (
    <dialog className="updates" ref={dialog} aria-labelledby="updates-title" onCancel={(e) => { e.preventDefault(); dismiss() }} onClose={dismiss}>
      <header className="updates__head">
        <div><p className="updates__version"><Sparkles size={15} />{RELEASE_VERSION}<span>{u.latest}</span></p><h2 id="updates-title">{view === 'history' ? u.history : u.title}</h2></div>
        <button type="button" className="sheet__close" onClick={dismiss} aria-label={u.close}><X size={18} /></button>
      </header>
      <div className="updates__body" ref={scroll}>
        {view === 'history' ? <>
          <p className="updates__intro">{u.note}</p>
          {u.languageNote && <p className="note">{u.languageNote}</p>}
          <div className="updates__history">{releases.map((r, i) => <details key={r.version} open={i === 0}>
            <summary><strong>{r.version}</strong>{r.date && <time dateTime={`${r.date.replace(' ', 'T')}+08:00`}>{r.date.slice(0, 10)}</time>}</summary>
            <div className="updates__release">{r.lead.map((s) => <p key={s}>{inline(s)}</p>)}{r.groups.map((g) => <section key={g.label}><h3>{g.label}</h3><ul>{g.items.map((s) => <li key={s}>{inline(s)}</li>)}</ul></section>)}</div>
          </details>)}</div>
        </> : <ul className="updates__summary">{u.summary.map((s, i) => <li key={s}><span>{String(i + 1).padStart(2, '0')}</span><p>{s}</p></li>)}</ul>}
      </div>
      <footer className="updates__actions">
        <button type="button" className="sheet__cta sheet__cta--quiet" onClick={() => { remember(); setView(view === 'history' ? 'overview' : 'history') }}><History size={16} />{view === 'history' ? u.back : u.history}</button>
        <button type="button" className="sheet__cta" onClick={dismiss}>{u.close}</button>
      </footer>
    </dialog>
  )
}
