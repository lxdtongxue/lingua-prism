import { useEffect, useMemo, useRef, useState } from 'react'
import { I18n } from './components/i18n'
import { content, type Lang } from './content/content'
import { Stage } from './components/Stage'
import { Nav } from './components/Nav'
import { Intro } from './components/Intro'
import { usePagerGesture } from './components/usePagerGesture'
import { Hero } from './sections/Hero'
import { Framework } from './sections/Framework'
import { Spectrum } from './sections/Spectrum'
import { Aptitude } from './sections/Aptitude'
import { Lab } from './sections/Lab'
import { Roadmap } from './sections/Roadmap'
import { Footer } from './sections/Footer'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* storage can be blocked; the default is fine */
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang)
  const t = content[lang]
  const track = useRef<HTMLElement>(null)
  usePagerGesture(track)

  useEffect(() => {
    document.documentElement.lang = t.htmlLang
    document.title = lang === 'zh' ? '语棱 Lingua Prism' : 'Lingua Prism 语棱'
    try {
      localStorage.setItem('lang', lang)
    } catch {
      /* ignore */
    }
  }, [lang, t.htmlLang])

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang])

  return (
    <I18n.Provider value={value}>
      <div className="app">
        <Stage />
        <div className="veil" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <Nav />
        <Intro />
        <main className="page" ref={track}>
          <Hero />
          <Framework />
          <Spectrum />
          <Aptitude />
          <Lab />
          <Roadmap />
        </main>
        <Footer />
        <div id="sheets" />
      </div>
    </I18n.Provider>
  )
}
