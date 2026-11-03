import { engine, Spring } from '../gl/engine'

// The site is two pages. The home page holds the hero, the project introduction, the
// goals and the references; the test center holds the TALL test and the recommendation.
export type Site = 'home' | 'center'
const LAYOUTS: Record<Site, string[][]> = {
  home: [['hero'], ['framework', 'spectrum', 'aptitude'], ['roadmap'], ['references']],
  center: [['test', 'lab']],
}
// Each html file says which page it is, before any script runs.
export const SITE: Site = document.documentElement.dataset.site === 'center' ? 'center' : 'home'

// Each sideways page is one tab. Its sections stack and scroll up and down inside it.
export const GROUPS = LAYOUTS[SITE]
export const SECTIONS = GROUPS.flat()
export const groupOf = (id: string) => GROUPS.findIndex((g) => g.includes(id))
const siteOf = (id: string) => (Object.keys(LAYOUTS) as Site[]).find((s) => LAYOUTS[s].flat().includes(id))
// A page's first section is its top, so it needs no hash.
export const siteUrl = (site: Site, id?: string) => `${import.meta.env.BASE_URL}${site === 'center' ? 'center/' : ''}${id && id !== LAYOUTS[site][0][0] ? `#${id}` : ''}`
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

// Browsers animate scrollTo({ behavior: 'smooth' }) in their own ways, and Safari's is
// plain where Chromium's feels springy. The jump runs on a spring in the engine's frame
// instead, so every browser moves the same way and the tab droplet follows along.
const glide = new Spring(0, 60, 13.5)
let gliding = false
let glideFrom = 0
let stopGlide = () => {}
const GRACE_MS = 400

function glideTo(top: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight
  glide.target = Math.min(max, Math.max(0, top))
  if (gliding) return
  gliding = true
  glideFrom = performance.now()
  glide.x = window.scrollY
  glide.v = 0
  const off = engine.onFrame((dt) => {
    glide.step(dt)
    pager.navUntil = performance.now() + 300
    const done = Math.abs(glide.x - glide.target) < 0.5 && Math.abs(glide.v) < 8
    window.scrollTo({ top: done ? glide.target : glide.x, behavior: 'instant' })
    if (done) stopGlide()
  })
  // The visitor taking over ends the glide. A trackpad's coasting wheel events right
  // after a click must not cancel it, hence the grace period.
  const cancel = (e: Event) => {
    if (e.type === 'wheel' && (performance.now() - glideFrom < GRACE_MS || Math.abs((e as WheelEvent).deltaY) < 2)) return
    stopGlide()
  }
  const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
  events.forEach((n) => window.addEventListener(n, cancel, { passive: true }))
  stopGlide = () => {
    off()
    events.forEach((n) => window.removeEventListener(n, cancel))
    gliding = false
    stopGlide = () => {}
  }
}

const ARRIVE = 'arrive'

// Moving between the two pages dips to black and comes back up on the other side.
export function navigate(url: string) {
  if (engine.reduced) return location.assign(url)
  if (document.querySelector('.page-dip')) return
  try {
    sessionStorage.setItem(ARRIVE, '1')
  } catch {
    /* the next page just arrives without the fade */
  }
  const dip = document.createElement('div')
  dip.className = 'page-dip'
  document.body.append(dip)
  window.setTimeout(() => location.assign(url), 280)
}

// Coming back with the Back button restores this page as it was, overlay and all.
window.addEventListener('pageshow', () => document.querySelectorAll('.page-dip').forEach((el) => el.remove()))
try {
  if (sessionStorage.getItem(ARRIVE)) {
    sessionStorage.removeItem(ARRIVE)
    document.documentElement.classList.add('arrive')
  }
} catch {
  /* no fade without storage */
}

export function goTo(id: string, instant = false) {
  const site = siteOf(id)
  if (site && site !== SITE) return navigate(siteUrl(site, id))
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
  const top = id === SECTIONS[0] ? 0 : box.top + window.scrollY - CLEAR_TOP - Math.max(0, (free - box.height) / 2)
  stopGlide()
  if (instant || engine.reduced) window.scrollTo({ top, behavior: 'instant' })
  else glideTo(top)
}

// Coming back from the test page lands on a section, not at the top. Late fonts can
// reflow the page, so the jump repeats once unless the visitor has already moved.
export function restoreHash() {
  const id = location.hash.slice(1)
  // An old link like /#lab now belongs to the other page.
  const site = siteOf(id)
  if (site && site !== SITE) return location.replace(siteUrl(site, id))
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
