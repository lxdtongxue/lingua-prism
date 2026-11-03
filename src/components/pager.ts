import { engine, Spring } from '../gl/engine'

// Each sideways page is one tab. Its sections stack and scroll up and down inside it.
export const GROUPS = [['hero'], ['test', 'lab'], ['framework', 'spectrum', 'aptitude'], ['roadmap'], ['references']]
export const SECTIONS = GROUPS.flat()
export const groupOf = (id: string) => GROUPS.findIndex((g) => g.includes(id))
const query = matchMedia('(max-width: 900px)')

type Listener = () => void
const listeners = new Set<Listener>()
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

// Single source of truth for sideways paging on phones and small tablets.
export const pager = {
  enabled: query.matches,
  page: 0,
  dockMin: false,
  navUntil: 0,
  pos: new Spring(0, 170, 25),
  subscribe(fn: Listener) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}

const emit = () => listeners.forEach((fn) => fn())

function applyMode() {
  document.documentElement.classList.toggle('pager', pager.enabled)
  engine.setPager(pager.enabled)
}

export function setPage(i: number, snap = false) {
  pager.page = clamp(i, 0, GROUPS.length - 1)
  pager.pos.target = pager.page
  if (snap || engine.reduced) {
    pager.pos.x = pager.page
    pager.pos.v = 0
  }
  emit()
}

export function setDockMin(on: boolean) {
  pager.dockMin = on
}

// Chrome clearance around a section after a jump: top bar above, tab bar below.
const CLEAR_TOP = 72
const CLEAR_BOTTOM = 96

export function goTo(id: string, instant = false) {
  // A jump is not the visitor scrolling, so it must not fold the tab bar.
  pager.navUntil = performance.now() + 1400
  const i = groupOf(id)
  const el = document.getElementById(id)
  if (pager.enabled && i >= 0) {
    const same = i === pager.page
    setPage(i)
    history.replaceState(null, '', i ? `#${id}` : location.pathname + location.search)
    const page = el?.closest<HTMLElement>('.tabpage')
    if (page && el) {
      const top = id === GROUPS[i][0] ? 0 : (el.querySelector('.wrap') ?? el).getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop - CLEAR_TOP
      page.scrollTo({ top, behavior: instant || !same || engine.reduced ? 'auto' : 'smooth' })
    }
    return
  }
  if (!el) return
  // Centre the whole module when it fits; otherwise start at its heading.
  const box = (el.querySelector('.wrap') ?? el).getBoundingClientRect()
  const free = window.innerHeight - CLEAR_TOP - CLEAR_BOTTOM
  const top = id === 'hero' ? 0 : box.top + window.scrollY - CLEAR_TOP - Math.max(0, (free - box.height) / 2)
  window.scrollTo({ top, behavior: instant || engine.reduced ? 'auto' : 'smooth' })
}

// Coming back from the test page lands on a section, not at the top. Late fonts can
// reflow the page, so the jump repeats once unless the visitor has already moved.
export function restoreHash() {
  const id = location.hash.slice(1)
  if (!SECTIONS.includes(id)) return
  goTo(id, true)
  const scroller = () => (pager.enabled ? (document.getElementById(id)?.closest('.tabpage')?.scrollTop ?? 0) : window.scrollY)
  const landed = scroller()
  document.fonts?.ready.then(() => {
    if (scroller() === landed) goTo(id, true)
  })
}

// Runs before the first render so nothing flashes in the desktop layout.
applyMode()
const fromHash = groupOf(location.hash.slice(1))
if (pager.enabled && fromHash > 0) setPage(fromHash, true)

query.addEventListener('change', () => {
  pager.enabled = query.matches
  applyMode()
  if (!pager.enabled) setPage(0, true)
  emit()
})
