import { useI18n } from '../components/i18n'
import { goTo } from '../components/pager'

export function FooterBody() {
  const { t } = useI18n()
  const f = t.footer
  return (
    <>
        <div>
          <h4>{f.fontTitle}</h4>
          <p>{f.font}</p>
          <a href={`${import.meta.env.BASE_URL}fonts/LICENSE.txt`} target="_blank" rel="noreferrer">
            {f.fontLink}
          </a>
        </div>
        <div>
          <h4>{f.dataTitle}</h4>
          <p>{f.data}</p>
          <button type="button" className="foot__link" onClick={() => goTo('references')}>
            {f.dataLink}
          </button>
        </div>
        <div>
          <h4>{f.sampleTitle}</h4>
          <p>{f.sample}</p>
        </div>
    </>
  )
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot__grid">
        <FooterBody />
      </div>
    </footer>
  )
}
