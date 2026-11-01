import { useI18n } from '../components/i18n'

export function Footer() {
  const { t } = useI18n()
  const f = t.footer
  return (
    <footer className="foot">
      <div className="wrap foot__grid">
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
        </div>
        <div>
          <h4>{f.sampleTitle}</h4>
          <p>{f.sample}</p>
        </div>
      </div>
    </footer>
  )
}
