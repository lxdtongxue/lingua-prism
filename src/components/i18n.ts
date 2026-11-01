import { createContext, useContext } from 'react'
import { content, type Content, type Lang } from '../content/content'

type Ctx = { t: Content; lang: Lang; setLang: (l: Lang) => void }

export const I18n = createContext<Ctx>({ t: content.zh, lang: 'zh', setLang: () => {} })
export const useI18n = () => useContext(I18n)
