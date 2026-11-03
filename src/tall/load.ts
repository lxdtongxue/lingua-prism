import { validateItems, type TallItems } from './items'
import itemsUrl from './tall_items.json?url'

export const asset = (path: string) => `${import.meta.env.BASE_URL}tall/${path}`

let cached: Promise<TallItems> | null = null

export function loadItems() {
  cached ??= fetch(itemsUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`tall_items.json: HTTP ${r.status}`)
      return r.json() as Promise<TallItems>
    })
    .then((d) => {
      const errors = validateItems(d)
      if (errors.length) throw new Error(errors.join('\n'))
      return d
    })
    .catch((e) => {
      cached = null
      throw e
    })
  return cached
}

// Fetching a file in full puts it in the browser's cache, so the real request later is instant.
export function prime(paths: string[], low = false) {
  return Promise.allSettled(
    paths.map(async (p) => {
      const r = await fetch(asset(p), low ? ({ priority: 'low' } as RequestInit) : undefined)
      if (r.ok) await r.arrayBuffer()
    }),
  )
}

export function preloadImages(paths: string[]) {
  return Promise.all(
    paths.map(
      (p) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve()
          img.onerror = () => reject(new Error(`Could not load ${p}`))
          img.src = asset(p)
        }),
    ),
  )
}
