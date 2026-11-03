import { validateItems, type TallItems } from './items'

export const asset = (path: string) => `${import.meta.env.BASE_URL}tall/${path}`

let cached: Promise<TallItems> | null = null

export function loadItems() {
  cached ??= fetch(asset('tall_items.json'))
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
