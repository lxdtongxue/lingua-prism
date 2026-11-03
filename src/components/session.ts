import { useSyncExternalStore } from 'react'
import { mergeSnapshots, sameSnapshot, SYNC_KEYS, type CloudState, type Data, type Profile, type Snapshot } from './sync-data'

export type Account = Profile & { id: string }
export type SyncStatus = 'local' | 'syncing' | 'saved' | 'offline' | 'signed_out'
const API = import.meta.env.VITE_SYNC_API_URL || (import.meta.env.BASE_URL === '/' ? '/api' : '')
export const syncAvailable = Boolean(API)
const read = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
const write = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)) } catch { /* this tab can still sync */ }
}
const old = read<Account & { code?: string } | null>('account', null)
let account: Account | null = old?.id ? { id: old.id, nickname: old.nickname, avatar: old.avatar } : null
write('account', account)
try { localStorage.removeItem('account-profiles') } catch { /* storage blocked */ }
let status: SyncStatus = account ? 'syncing' : 'local'
let ready = !API
let base: CloudState | null = account ? read<CloudState | null>(`lp-cloud-base:${account.id}`, null) : null
let generation = 0
let connecting = false
let flight: Promise<void> | null = null
let timer = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(fn => fn())
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
export const useAccount = () => useSyncExternalStore(subscribe, () => account)
export const useSyncStatus = () => useSyncExternalStore(subscribe, () => status)
export const useSessionReady = () => useSyncExternalStore(subscribe, () => ready)

function localData(): Data {
  return Object.fromEntries(SYNC_KEYS.flatMap(key => {
    const value = read<unknown>(key, null)
    return value === null ? [] : [[key, value]]
  })) as Data
}
const snapshot = (): Snapshot => ({ profile: { nickname: account?.nickname ?? 'Lingua', avatar: account?.avatar ?? 0 }, data: localData() })
function apply(data: Data) {
  for (const key of SYNC_KEYS) write(key, data[key] ?? null)
  window.dispatchEvent(new Event('lp-state-imported'))
}
function accept(remote: CloudState, next: Snapshot = remote) {
  base = remote
  account = { id: remote.id, ...next.profile }
  write('account', account)
  write(`lp-cloud-base:${remote.id}`, remote)
  apply(next.data)
  status = sameSnapshot(next, remote) ? 'saved' : 'syncing'
  emit()
}
class ApiError extends Error {
  constructor(public status: number, public body: unknown) { super(status === 429 ? 'rate_limit' : status === 401 ? 'signed_out' : 'network') }
}
async function api(path: string, method = 'GET', body?: unknown): Promise<CloudState & { created?: boolean }> {
  if (!API) throw new Error('unavailable')
  const response = await fetch(API + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(12000), cache: 'no-store' })
  const value = await response.json()
  if (!response.ok) throw new ApiError(response.status, value)
  return value
}
function schedule() {
  if (!account || !API) return
  write(`lp-cloud-dirty:${account.id}`, true)
  status = 'syncing'
  emit()
  clearTimeout(timer)
  timer = window.setTimeout(() => { void syncNow() }, 650)
}
export function syncNow(): Promise<void> {
  const task = flight ? flight.then(runSync, runSync) : runSync()
  flight = task
  void task.finally(() => { if (flight === task) flight = null })
  return task
}
async function runSync(): Promise<void> {
  if (!account || !API || connecting) return
  const current = generation
  try {
    let remote = await api('/state')
    if (generation !== current) return
    if (remote.id !== account.id) {
      write(`lp-offline:${account.id}`, snapshot())
      accept(remote)
      return
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const local = snapshot()
      const next = mergeSnapshots(base ?? remote, local, remote)
      if (!sameSnapshot(next, remote)) {
        try { remote = await api('/state', 'PUT', { ...next, revision: remote.revision }) }
        catch (error) {
          if (error instanceof ApiError && error.status === 409) { remote = error.body as CloudState; continue }
          throw error
        }
      }
      if (generation !== current) return
      const pending = mergeSnapshots(local, snapshot(), remote)
      accept(remote, pending)
      if (sameSnapshot(pending, remote)) { write(`lp-cloud-dirty:${remote.id}`, null); write(`lp-offline:${remote.id}`, null) }
      else schedule()
      return
    }
    throw new Error('network')
  } catch (error) {
    if (generation !== current) return
    status = error instanceof ApiError && error.status === 401 ? 'signed_out' : 'offline'
    emit()
  } finally { if (account && status === 'syncing') schedule() }
}
export async function connectToken(token: string, importLocal: boolean) {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) throw new Error('bad_token')
  const before = snapshot()
  const previous = account
  const previousBase = base
  generation++
  clearTimeout(timer)
  connecting = true
  let remote: CloudState & { created?: boolean }
  try { remote = await api('/session', 'POST', { token }) }
  finally { connecting = false }
  generation++
  if (!previous) write('lp-guest-backup', before.data)
  else write(`lp-offline:${previous.id}`, before)
  write('lp-signed-out', null)
  let next: Snapshot = remote
  const pending = read<Snapshot | null>(`lp-offline:${remote.id}`, null)
  const savedBase = read<CloudState | null>(`lp-cloud-base:${remote.id}`, null)
  if (pending && savedBase) next = mergeSnapshots(savedBase, pending, remote)
  if (previous?.id === remote.id && previousBase) next = mergeSnapshots(previousBase, before, remote)
  if (importLocal && !previous) next = { profile: remote.profile, data: mergeSnapshots({ profile: remote.profile, data: {} }, { profile: remote.profile, data: before.data }, next).data }
  accept(remote, next)
  if (!sameSnapshot(next, remote)) { schedule(); await syncNow() }
  return Boolean(remote.created)
}
export function updateProfile(patch: Partial<Profile>) {
  if (!account) return
  account = { ...account, ...patch }
  write('account', account)
  emit()
  schedule()
}
function leave() {
  generation++
  clearTimeout(timer)
  account = null
  base = null
  write('account', null)
  write('lp-signed-out', true)
  apply(read<Data>('lp-guest-backup', {}))
  write('lp-guest-backup', null)
  status = 'local'
  emit()
}
export async function signOut() {
  try { await syncNow(); if (account && status !== 'saved') write(`lp-offline:${account.id}`, snapshot()); await api('/session', 'DELETE') } catch { /* local sign-out remains effective offline */ }
  leave()
}
export async function deleteAccount() {
  const id = account?.id
  await api('/account', 'DELETE')
  for (const prefix of ['lp-cloud-base:', 'lp-cloud-dirty:', 'lp-offline:']) if (id) write(prefix + id, null)
  leave()
}
window.addEventListener('lp-data-changed', schedule)
window.addEventListener('online', () => { void syncNow() })
window.addEventListener('focus', () => { void syncNow() })
document.addEventListener('visibilitychange', () => { if (!document.hidden) void syncNow() })
window.addEventListener('storage', event => {
  if (event.key === 'account') {
    generation++
    account = read<Account | null>('account', null)
    base = account ? read<CloudState | null>(`lp-cloud-base:${account.id}`, null) : null
    emit()
    window.dispatchEvent(new Event('lp-state-imported'))
    status = account ? 'syncing' : 'local'
    void syncNow()
  } else if (event.key && SYNC_KEYS.includes(event.key as typeof SYNC_KEYS[number])) schedule()
})
window.setInterval(() => { if (!document.hidden) void syncNow() }, 15000)
async function bootstrap() {
  if (!API || read('lp-signed-out', false)) { ready = true; emit(); return }
  const current = generation
  try {
    if (account) await syncNow()
    else {
      const remote = await api('/state')
      if (generation === current) { write('lp-guest-backup', localData()); accept(remote) }
    }
  } catch { /* guest or offline: local records stay usable */ }
  finally { ready = true; emit() }
}
void bootstrap()
