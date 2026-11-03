import { useEffect, useMemo, useState } from 'react'
import { I18n, initialLang } from '../components/i18n'
import { useTall } from '../components/tall'
import { content } from '../content/content'
import { Exam } from './Exam'
import { ORDER, type Sub } from './items'
import { LanguageBackdrop } from './LanguageBackdrop'

const home = (hash: string) => `${import.meta.env.BASE_URL}center/#${hash}`

// The second-level page. Going back to the overview is a real navigation, so a
// subtest in progress leaves nothing behind and the browser's Back button works.
export function TestApp() {
  const [lang] = useState(initialLang)
  const t = content[lang]
  const { results } = useTall()
  const firstOpen = ORDER.find((s) => !results[s])
  const [sub, setSub] = useState<Sub | undefined>(() => {
    const asked = new URLSearchParams(location.search).get('sub') as Sub | null
    if (!asked || !ORDER.includes(asked)) return firstOpen
    const earlier = ORDER.slice(0, ORDER.indexOf(asked))
    return earlier.every((s) => results[s]) ? asked : firstOpen
  })
  const value = useMemo(() => ({ t, lang, setLang: () => {} }), [t, lang])

  useEffect(() => {
    document.documentElement.lang = t.htmlLang
    document.title = `${t.test.kicker} · ${t.brand}`
    if (!sub) return
    history.replaceState(null, '', `?sub=${sub}`)
  }, [t, sub])

  useEffect(() => {
    if (!sub) location.replace(home('test'))
  }, [sub])

  return (
    <I18n.Provider value={value}>
      <LanguageBackdrop />
      {sub && <Exam key={sub} sub={sub} onNext={setSub} onClose={() => location.assign(home('test'))} onFinish={() => location.assign(home('lab'))} />}
    </I18n.Provider>
  )
}
