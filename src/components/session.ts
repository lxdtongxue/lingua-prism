import { useSyncExternalStore } from 'react'

// Sign-in checks a code against a static list of hashes; the nickname and avatar
// stay in this browser. Nothing is sent anywhere.
const KEY = 'account'
const PROFILES = 'account-profiles'

export type Account = { code: string; nickname: string; avatar: number }
type Profile = Omit<Account, 'code'>

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (key: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage blocked: the sign-in lasts until the page closes */
  }
}

let state = read<Account | null>(KEY, null)
const listeners = new Set<() => void>()
const commit = (next: Account | null) => {
  state = next
  write(KEY, next)
  if (next) write(PROFILES, { ...read<Record<string, Profile>>(PROFILES, {}), [next.code]: { nickname: next.nickname, avatar: next.avatar } })
  listeners.forEach((fn) => fn())
}
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export const useAccount = () => useSyncExternalStore(subscribe, () => state)

async function hash(code: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`lingua-prism:${code}`))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

let list: Promise<Set<string>> | null = null
const codes = () =>
  (list ??= fetch(`${import.meta.env.BASE_URL}codes.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('network'))))
    .then((a: string[]) => new Set(a))
    .catch((e) => {
      list = null
      throw e
    }))

export type CheckError = 'bad_code' | 'not_found' | 'network'

// Returns the profile this device last used with the code, if any.
export async function checkCode(code: string): Promise<Profile | null> {
  if (!/^\d{8}$/.test(code)) throw new Error('bad_code')
  const [set, h] = await Promise.all([codes(), hash(code)])
  if (!set.has(h)) throw new Error('not_found')
  return read<Record<string, Profile>>(PROFILES, {})[code] ?? null
}

export const signIn = (a: Account) => commit(a)
export const updateProfile = (patch: Partial<Profile>) => state && commit({ ...state, ...patch })
export const signOut = () => commit(null)
