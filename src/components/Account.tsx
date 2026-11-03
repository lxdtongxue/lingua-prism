import { useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { connectToken, deleteAccount, signOut, syncAvailable, syncNow, updateProfile, useAccount, useSyncStatus } from './session'
import { Avatar, AVATARS } from './Avatar'
import { useI18n } from './i18n'
import { Sheet } from './Sheet'

type View = 'home' | 'code' | 'profile'
function Picker({ value, onPick }: { value: number; onPick: (i: number) => void }) {
  const { t } = useI18n()
  return <div className="avatars" role="radiogroup" aria-label={t.account.pickAvatar}>{AVATARS.map((_, i) => (
    <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={t.account.avatarNames[i]} onClick={() => onPick(i)}><Avatar id={i} size={52} /></button>
  ))}</div>
}

export function Account({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const a = t.account
  const account = useAccount()
  const status = useSyncStatus()
  const [view, setView] = useState<View>('home')
  const [token, setToken] = useState('')
  const [importLocal, setImportLocal] = useState(false)
  const [consent, setConsent] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    if (open) return
    const timer = window.setTimeout(() => { setView('home'); setError(null); setToken(''); setConsent(false); setImportLocal(false); setDeleting(false) }, 400)
    return () => clearTimeout(timer)
  }, [open])
  const onCode = async (event: FormEvent) => {
    event.preventDefault()
    if (!consent) return
    setBusy(true); setError(null)
    try {
      const created = await connectToken(token.trim(), importLocal)
      setToken('')
      if (created) { setNickname('Lingua'); setAvatar(0); setView('profile') } else setView('home')
    } catch (error) {
      const code = (error as Error).message
      setError(code === 'bad_token' ? a.errors.bad_token : code === 'rate_limit' ? a.errors.rate_limit : code === 'unavailable' ? a.unavailable : a.errors.network)
    } finally { setBusy(false) }
  }
  const onProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (!nickname.trim()) return setError(a.nicknameEmpty)
    updateProfile({ nickname: nickname.trim(), avatar })
    setView('home'); setError(null)
    await syncNow()
  }
  const remove = async () => {
    setBusy(true); setError(null)
    try { await deleteAccount(); setDeleting(false); setView('home') }
    catch { setError(a.errors.network) }
    finally { setBusy(false) }
  }
  const err = error && <p className="acct__err" role="alert">{error}</p>
  const back = <button type="button" className="acct__back" onClick={() => { setView('home'); setError(null); setToken('') }}><ChevronLeft size={16} />{a.back}</button>
  let body
  if (view === 'profile' && account) {
    body = <form className="acct acct__form" onSubmit={onProfile}>
      {back}<label className="field"><span>{a.nickname}</span><input value={nickname} maxLength={20} onChange={event => setNickname(event.target.value)} placeholder={a.nicknamePh} /></label>
      <span className="micro">{a.pickAvatar}</span><Picker value={avatar} onPick={setAvatar} />{err}<button type="submit" className="sheet__cta">{a.save}</button>
    </form>
  } else if (view === 'code') {
    body = <form className="acct acct__form" onSubmit={onCode}>
      {back}<label className="field"><span>{a.codeLabel}</span><input className="acct__input" type="password" value={token} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={32} placeholder={a.codePh} onChange={event => { setToken(event.target.value); setError(null) }} /></label>
      <p className="note">{a.codeHelp}</p>
      <label className="acct__consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{a.consent}</span></label>
      {!account && <label className="acct__consent"><input type="checkbox" checked={importLocal} onChange={event => setImportLocal(event.target.checked)} /><span>{a.importLocal}</span></label>}
      {err}<button type="submit" className="sheet__cta" disabled={busy || !consent || !/^[A-Za-z0-9_-]{8,32}$/.test(token.trim())}>{busy ? a.connecting : a.next}</button>
    </form>
  } else if (account) {
    body = <div className="acct">
      <div className="acct__me"><Avatar id={account.avatar} size={72} /><div><strong>{account.nickname}</strong><span className="acct__status">{a.titleIn}</span></div></div>
      <p className="acct__sync" role="status">{a.sync[status]}</p><p className="note">{a.localNote}</p>{err}
      <div className="acct__row">
        <button type="button" className="sheet__cta" onClick={() => { setNickname(account.nickname); setAvatar(account.avatar); setView('profile') }}>{a.edit}</button>
        <button type="button" className="sheet__cta sheet__cta--quiet" onClick={() => { void signOut() }}>{a.signOut}</button>
        {status === 'signed_out' ? <button type="button" className="sheet__cta" onClick={() => setView('code')}>{a.codeLogin}</button> : <button type="button" className="sheet__cta sheet__cta--quiet" onClick={() => { void syncNow() }}>{a.syncNow}</button>}
      </div>
      <div className="acct__delete">{deleting ? <><p className="note">{a.deleteNote}</p><div className="acct__row"><button type="button" className="sheet__cta" disabled={busy} onClick={() => { void remove() }}>{a.deleteConfirm}</button><button type="button" className="sheet__cta sheet__cta--quiet" onClick={() => setDeleting(false)}>{a.back}</button></div></> : <button type="button" className="foot__link" onClick={() => setDeleting(true)}>{a.deleteAccount}</button>}</div>
    </div>
  } else {
    body = <div className="acct"><p className="sheet__lead">{a.lead}</p><p className="note">{a.storageNote}</p>{syncAvailable ? <button type="button" className="sheet__cta" onClick={() => setView('code')}>{a.codeLogin}</button> : <p className="note">{a.unavailable}</p>}</div>
  }
  return <Sheet open={open} onClose={onClose} kicker={a.kicker} title={account ? a.titleIn : a.titleOut}>{body}</Sheet>
}
