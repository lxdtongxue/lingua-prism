import { useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, KeyRound, Smartphone } from 'lucide-react'
import { checkCode, signIn, signOut, updateProfile, useAccount, type CheckError } from './session'
import { Avatar, AVATARS } from './Avatar'
import { useI18n } from './i18n'
import { Sheet } from './Sheet'

type View = 'home' | 'code' | 'profile'
const pretty = (c: string) => `${c.slice(0, 4)} ${c.slice(4)}`.trim()

function Picker({ value, onPick }: { value: number; onPick: (i: number) => void }) {
  const { t } = useI18n()
  return (
    <div className="avatars" role="radiogroup" aria-label={t.account.pickAvatar}>
      {AVATARS.map((_, i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={t.account.avatarNames[i]} onClick={() => onPick(i)}>
          <Avatar id={i} size={52} />
        </button>
      ))}
    </div>
  )
}

export function Account({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const a = t.account
  const account = useAccount()
  const [view, setView] = useState<View>('home')
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => {
      setView('home')
      setError(null)
      setHint(false)
    }, 400)
    return () => window.clearTimeout(id)
  }, [open])

  const onCode = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const known = await checkCode(code)
      setNickname(known?.nickname ?? '')
      setAvatar(known?.avatar ?? Math.floor(Math.random() * AVATARS.length))
      setView('profile')
    } catch (err) {
      const k = (err as Error).message as CheckError
      setError(a.errors[k in a.errors ? k : 'network'])
    } finally {
      setBusy(false)
    }
  }

  const onProfile = (e: FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) return setError(a.nicknameEmpty)
    if (account) updateProfile({ nickname: nickname.trim(), avatar })
    else signIn({ code, nickname: nickname.trim(), avatar })
    setCode('')
    setError(null)
    setView('home')
  }

  const err = error && (
    <p className="acct__err" role="alert">
      {error}
    </p>
  )
  const back = (
    <button type="button" className="acct__back" onClick={() => (setView(account ? 'home' : view === 'profile' ? 'code' : 'home'), setError(null))}>
      <ChevronLeft size={16} strokeWidth={2} />
      {a.back}
    </button>
  )

  let body
  if (view === 'profile') {
    body = (
      <form className="acct acct__form" onSubmit={onProfile}>
        {back}
        {!account && <p className="note">{a.codeOk}</p>}
        <label className="field">
          <span>{a.nickname}</span>
          <input value={nickname} maxLength={20} onChange={(e) => (setNickname(e.target.value), setError(null))} placeholder={a.nicknamePh} />
        </label>
        <span className="micro">{a.pickAvatar}</span>
        <Picker value={avatar} onPick={setAvatar} />
        {err}
        <button type="submit" className="sheet__cta">
          {account ? a.save : a.enter}
        </button>
      </form>
    )
  } else if (account) {
    body = (
      <div className="acct">
        <div className="acct__me">
          <Avatar id={account.avatar} size={72} />
          <div>
            <strong>{account.nickname}</strong>
            <span className="acct__status">
              {a.codeLabel} •••• {account.code.slice(4)}
            </span>
          </div>
        </div>
        <p className="note">{a.localNote}</p>
        <div className="acct__row">
          <button
            type="button"
            className="sheet__cta"
            onClick={() => {
              setNickname(account.nickname)
              setAvatar(account.avatar)
              setView('profile')
            }}
          >
            {a.edit}
          </button>
          <button type="button" className="sheet__cta sheet__cta--quiet" onClick={signOut}>
            {a.signOut}
          </button>
        </div>
      </div>
    )
  } else if (view === 'code') {
    body = (
      <form className="acct acct__form" onSubmit={onCode}>
        {back}
        <label className="field">
          <span>{a.codeLabel}</span>
          <input
            className="acct__input"
            value={pretty(code)}
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="go"
            placeholder={a.codePh}
            onChange={(e) => (setCode(e.target.value.replace(/\D/g, '').slice(0, 8)), setError(null))}
          />
        </label>
        {err}
        <button type="submit" className="sheet__cta" disabled={busy || code.length !== 8}>
          {a.next}
        </button>
        <p className="note">{a.codeHelp}</p>
      </form>
    )
  } else {
    body = (
      <div className="acct">
        <p className="sheet__lead">{a.lead}</p>
        <div className="acct__ways">
          {/* Code sign-in works but stays closed until the team settles on it. */}
          <button type="button" className="acct__way" aria-disabled="true" onClick={() => setHint(true)}>
            <KeyRound size={20} strokeWidth={1.8} />
            <span>
              <strong>{a.codeLogin}</strong>
              <small>{a.codeLoginSub}</small>
            </span>
            <em className="tag">{a.beta}</em>
          </button>
          <button type="button" className="acct__way" aria-disabled="true" onClick={() => setHint(true)}>
            <Smartphone size={20} strokeWidth={1.8} />
            <span>
              <strong>{a.otherLogin}</strong>
              <small>{a.otherLoginSub}</small>
            </span>
            <em className="tag">{a.beta}</em>
          </button>
        </div>
        {hint && (
          <p className="note" role="status">
            {a.betaNote}
          </p>
        )}
      </div>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} kicker={a.kicker} title={account ? a.titleIn : a.titleOut}>
      {body}
    </Sheet>
  )
}
