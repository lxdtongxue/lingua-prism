export const SYNC_KEYS = ['tall-results', 'decision-state', 'known-languages'] as const
export type SyncKey = typeof SYNC_KEYS[number]
export type Data = Partial<Record<SyncKey, unknown>>
export type Profile = { nickname: string; avatar: number }
export type Snapshot = { profile: Profile; data: Data }
export type CloudState = Snapshot & { id: string; revision: number }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
function merge(base: unknown, local: unknown, remote: unknown, path: string): unknown {
  if (same(local, base)) return remote
  if (same(remote, base) || same(local, remote)) return local
  // A completed test must never combine a score from one attempt with another's trials.
  if (/^data\.tall-results\.(VL|SD|LA)$/.test(path)) {
    if (object(local) && object(remote)) return Number(local.at) >= Number(remote.at) ? local : remote
    return local
  }
  if (object(local) && object(remote)) {
    const out: Record<string, unknown> = {}
    for (const key of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(object(base) ? base : {})])) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue
      const value = merge(object(base) ? base[key] : undefined, local[key], remote[key], path ? `${path}.${key}` : key)
      if (value !== undefined) out[key] = value
    }
    return out
  }
  return local
}
const pick = (s: Snapshot): Snapshot => ({ profile: s.profile, data: s.data })
export const mergeSnapshots = (base: Snapshot, local: Snapshot, remote: Snapshot) => merge(pick(base), pick(local), pick(remote), '') as Snapshot
export const sameSnapshot = (a: Snapshot, b: Snapshot) => same(pick(a), pick(b))
export function dataChanged(key: SyncKey) {
  window.dispatchEvent(new CustomEvent('lp-data-changed', { detail: key }))
}
