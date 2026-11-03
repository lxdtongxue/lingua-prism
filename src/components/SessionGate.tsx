import type { ReactNode } from 'react'
import { useSessionReady } from './session'
import { initialLang } from './i18n'

export function SessionGate({ children }: { children: ReactNode }) {
  const ready = useSessionReady()
  return ready ? children : <main className="session-loading" role="status">{initialLang() === 'zh' ? '正在读取记录…' : 'Loading your records…'}</main>
}
