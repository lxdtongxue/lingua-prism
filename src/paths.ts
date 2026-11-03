export const sections = ['hero', 'framework', 'spectrum', 'aptitude', 'roadmap', 'references', 'test', 'lab'] as const
export type Section = typeof sections[number]
export type Site = 'home' | 'center'

const isSection = (value: string | null): value is Section => sections.includes(value as Section)
export const siteForSection = (id: string): Site | undefined => !isSection(id) ? undefined : id === 'test' || id === 'lab' ? 'center' : 'home'

// Query parameters survive clients that encode a fragment delimiter into %23.
export function pagePath(base: string, site: Site, section?: string) {
  const root = base.replace(/\/?$/, '/')
  const id = section && siteForSection(section) === site ? section : site === 'center' ? 'test' : 'hero'
  return `${root}${site === 'center' ? 'center/' : ''}index.html${id === 'hero' ? '' : `?section=${id}`}`
}

export function centerPath(base: string, section: 'test' | 'lab' = 'test') {
  return pagePath(base, 'center', section)
}

export function readSection(search: string, hash: string): Section | undefined {
  const query = new URLSearchParams(search).get('section')
  if (isSection(query)) return query
  const legacy = hash.slice(1)
  return isSection(legacy) ? legacy : undefined
}

// Recover only known, same-site legacy paths; unknown 404s stay 404s.
export function recoverLegacyPath(pathname: string, base: string): string | undefined {
  let path = pathname
  try {
    for (let i = 0; i < 2 && /%23|%25/i.test(path); i++) path = decodeURIComponent(path)
  } catch { return }
  const marker = path.indexOf('#')
  if (marker < 0) return
  const root = base.replace(/\/?$/, '/')
  if (![root, `${root}index.html`, `${root}center`, `${root}center/`, `${root}center/index.html`].includes(path.slice(0, marker))) return
  const id = path.slice(marker + 1)
  const site = siteForSection(id)
  return site ? pagePath(root, site, id) : undefined
}
