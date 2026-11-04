import { useI18n } from '../components/i18n'
import { goTo } from '../components/pager'
import { openUpdates, RELEASE_VERSION } from '../components/Updates'

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
        <div>
          <h4>{f.contactTitle}</h4>
          <p>{f.contact}</p>
          <a href={`mailto:${f.contactEmail}`}>{f.contactEmail}</a>
        </div>
    </>
  )
}

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="foot">
      <div className="wrap foot__grid foot__desktop">
        <FooterBody />
      </div>
      <details className="wrap foot__mobile">
        <summary>{t.footer.mobileLabel}</summary>
        <div className="foot-body"><FooterBody /></div>
      </details>
      <div className="wrap foot__updates"><span>语棱 Lingua Prism · {RELEASE_VERSION}</span><button type="button" className="foot__link" onClick={openUpdates}>{t.updates.entry}</button></div>
    </footer>
  )
}
