import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18n, initialLang } from '../components/i18n'
import { patchAnswers, setTier, setSurveyPage, useDecision } from '../components/decision'
import { content } from '../content/content'
import demands from '../data/language_demands.json'
import { COUNTRY_EN, ORIENT_ORDER, questions, REGION_EN, REVERSED, SITUATIONS } from './questions'
import { pageIndex, pageReady, pagesFor, type Page } from './flow'
import { centerPath } from '../paths'
import { ACAD_SUBS, bestGoal, checks, COUNTRIES, GOALS, interestOf, JOB_SUBS, LANGS, ORIENT_ITEMS, questionnaireWeights, REGIONS, topRegion, weightInput, type Answers, type Detail, type Goal, type Mode, type Scored } from './score'

const home = centerPath(import.meta.env.BASE_URL, 'lab')

function Choices({ labels, value, onPick, values }: { labels: string[]; value: number | string | null | undefined; onPick: (v: never) => void; values?: (number | string)[] }) {
  return (
    <div className="sv-opts" role="radiogroup">
      {labels.map((label, i) => {
        const v = values ? values[i] : i + 1
        return (
          <button key={label} type="button" role="radio" aria-checked={value === v} className="sv-opt" onClick={() => onPick(v as never)}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function Item({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="sv-item">
      <p className="sv-q">{title}</p>
      {hint && <p className="sv-hint">{hint}</p>}
      {children}
    </div>
  )
}

export function Survey() {
  const [lang] = useState(initialLang)
  const c = questions[lang]
  const t = content[lang]
  const { answers: a, tier, surveyPage } = useDecision()
  const pages = useMemo(() => pagesFor(a, tier), [a, tier])
  const at = pageIndex(pages, surveyPage, a)
  const setAt = setSurveyPage
  useEffect(() => { if (surveyPage !== at) setSurveyPage(at) }, [surveyPage, at])
  const page = pages[at]
  const value = useMemo(() => ({ t, lang, setLang: () => {} }), [t, lang])
  const set = (patch: Partial<Answers>) => patchAnswers({ ...patch, confirmed: false })

  useEffect(() => {
    document.documentElement.lang = t.htmlLang
    document.title = `${c.title} · ${t.brand}`
    window.scrollTo(0, 0)
    document.querySelector('.exam__body')?.scrollTo(0, 0)
  }, [t, c, at])

  const regionName = (r: string | null) => (r ? (lang === 'zh' ? r : (REGION_EN[r] ?? r)) : c.someRegion)
  const goalWord = a.g1 && a.g1 !== 'none' ? a.g1 : GOALS.some(g => a.goals[g] > 0) ? bestGoal(a.goals) : null
  const fill = (s: string) => s.replace(/\{goal\}/g, goalWord ? c.goalsShort[goalWord] : c.generalGoal).replace(/\{region\}/g, regionName(topRegion(a))).replace(/\{mode\}/g, c.modeWords[a.mode])

  const ready = pageReady(page, a)
  const finish = () => {
    if (!pages.every(page => pageReady(page, a))) return
    setSurveyPage(0)
    patchAnswers({ done: true, confirmed: tier === 'sponsor', hits: checks(a).map((h) => h.id) })
    location.assign(home)
  }
  const last = at >= pages.length - 1

  const pickG1 = (g: Goal | 'none') => set({ g1: g, goals: g === 'none' ? a.goals : { ...a.goals, [g]: 3 } })
  const toggleCountry = (key: 'study' | 'travel', name: string) => {
    const list = a.countries[key]
    set({ countries: { ...a.countries, [key]: list.includes(name) ? list.filter((x) => x !== name) : [...list, name] } })
  }

  const countryPage = (key: 'study' | 'travel', title: string) => (
    <Item title={title}>
      <div className="sv-opts sv-opts--wrap">
        <button type="button" className="sv-opt" aria-pressed={a.countries[key].length === 0} onClick={() => set({ countries: { ...a.countries, [key]: [] } })}>
          {c.undecided}
        </button>
        {Object.keys(COUNTRIES).map((name) => (
          <button key={name} type="button" className="sv-opt" aria-pressed={a.countries[key].includes(name)} onClick={() => toggleCountry(key, name)}>
            {lang === 'zh' ? name : (COUNTRY_EN[name] ?? name)}
          </button>
        ))}
      </div>
    </Item>
  )
  const subPage = (title: string, subs: readonly Detail[]) => (
    <>
      <p className="sv-q">{title}</p>
      {subs.map((s) => (
        <Item key={s} title={c.subs[s]}>
          <Choices labels={c.importance} values={[0, 1, 2, 3]} value={a.sub[s] ?? null} onPick={(v: number) => set({ sub: { ...a.sub, [s]: v } })} />
        </Item>
      ))}
    </>
  )

  const confirm = () => {
    const q = weightInput(a)
    if (!q) return null
    const r = questionnaireWeights(q)
    const dims = (['G', 'R', 'P'] as const).map((d, i) => ({ d, pi: r.pi[i], w: Math.round(r.pi[i] * 1000) / 10 })).sort((x, y) => y.pi - x.pi)
    const top = dims[0].d
    const scored = (id: string) => (REVERSED.includes(id) ? 6 - a.orient[id] : a.orient[id])
    const item = [...ORIENT_ITEMS[top]].sort((x, y) => scored(y) - scored(x))[0]
    const favoured = (d: Scored) => {
      const sides: ['S1' | 'S2' | 'S3', number][] = d === 'G' ? [['S1', 1], ['S2', 1]] : d === 'R' ? [['S3', 1], ['S2', -1]] : [['S1', -1], ['S3', -1]]
      return sides.find(([s, sign]) => (a.S[s] as number) * sign > 0)
    }
    const pick = favoured(top)
    const hits = checks(a)
    return (
      <div className="sv-confirm">
        {hits.map((h) => (
          <p className="exam__warn" key={h.id}>
            {c.checks[h.id].replace('{g1}', a.g1 && a.g1 !== 'none' ? c.goalsShort[a.g1] : '').replace('{other}', h.other ? c.goalsShort[h.other] : '')}
          </p>
        ))}
        <h2>{c.confirmTitle}</h2>
        <p>{c.confirmLead}</p>
        <p className="sv-hint">{c.ratioNote}</p>
        <ul>
          <li>
            <strong>{c.firstDim.replace('{dim}', c.dims[top]).replace('{w}', String(dims[0].w))}</strong>
            {r.straight ? '' : `：${c.evidence.replace('{item}', c.orient[item]).replace('{option}', c.agree[a.orient[item] - 1])}`}
            {pick ? c.evidenceS.replace('{s}', pick[0]).replace('{side}', pick[1] * (a.S[pick[0]] as number) > 0 && (a.S[pick[0]] as number) > 0 ? c.sideA : c.sideB) : ''}
          </li>
          <li>{c.secondDim.replace('{dim}', c.dims[dims[1].d]).replace('{w}', String(dims[1].w))}</li>
          <li>{c.thirdDim.replace('{dim}', c.dims[dims[2].d]).replace('{w}', String(dims[2].w))}</li>
        </ul>
        <p>{c.summary.replace('{goal}', goalWord ? c.goalsShort[goalWord] : c.unset).replace('{region}', topRegion(a) ? regionName(topRegion(a)) : c.unset).replace('{mode}', c.modeWords[a.mode])}</p>
        <p className="sv-q">{c.confirmAsk}</p>
        <div className="exam__row">
          <button type="button" className="exam__btn" onClick={finish}>
            {c.confirmYes}
          </button>
          <button type="button" className="exam__btn exam__btn--quiet" onClick={() => setAt(1)}>
            {c.confirmNo}
          </button>
        </div>
      </div>
    )
  }

  const body: Record<Page, () => ReactNode> = {
    start: () => (
      <>
        <h2>{c.startTitle}</h2>
        <p className="sv-hint">{c.startBody}</p>
        <div className="sv-tiers">
          {(['basic', 'sponsor'] as const).map((id) => (
            <button key={id} type="button" className="sv-tier" aria-pressed={tier === id} onClick={() => setTier(id)}>
              <strong>
                {id === 'basic' ? c.basicName : c.sponsorName}
              </strong>
              <span>{id === 'basic' ? c.basicBody : c.sponsorBody}</span>
            </button>
          ))}
        </div>
      </>
    ),
    orient: () => (
      <>
        <p className="sv-q">{c.orientIntro}</p>
        {ORIENT_ORDER.map((id) => (
          <Item key={id} title={c.orient[id]}>
            <Choices labels={c.agree} value={a.orient[id]} onPick={(v: number) => set({ orient: { ...a.orient, [id]: v } })} />
          </Item>
        ))}
      </>
    ),
    g1: () => (
      <Item title={c.g1}>
        <Choices labels={[...GOALS.map((g) => c.goals[g]), c.g1None]} values={[...GOALS, 'none']} value={a.g1} onPick={pickG1} />
      </Item>
    ),
    g2: () => (
      <>
        <p className="sv-q">{c.g2}</p>
        {GOALS.map((g) => (
          <Item key={g} title={c.goals[g]} hint={c.goalHints[g]}>
            <Choices labels={c.importance} values={[0, 1, 2, 3]} value={a.goals[g]} onPick={(v: number) => set({ goals: { ...a.goals, [g]: v } })} />
          </Item>
        ))}
      </>
    ),
    g3: () => subPage(c.g3, JOB_SUBS),
    g4: () => countryPage('study', c.g4),
    g5: () => countryPage('travel', c.g5),
    g6: () => subPage(c.g6, ACAD_SUBS),
    r1: () => (
      <Item title={c.r1}>
        <Choices labels={(['offline', 'online', 'both'] as Mode[]).map((m) => c.modes[m])} values={['offline', 'online', 'both']} value={a.mode} onPick={(m: Mode) => set({ mode: m })} />
      </Item>
    ),
    p1: () => (
      <>
        <p className="sv-q">{c.p1}</p>
        <p className="sv-hint">{c.p1Hint}</p>
        {REGIONS.map((r) => (
          <Item key={r} title={lang === 'zh' ? r : (REGION_EN[r] ?? r)}>
            <Choices labels={c.interest} value={a.regionInterest[r]} onPick={(v: number) => set({ regionInterest: { ...a.regionInterest, [r]: v } })} />
          </Item>
        ))}
      </>
    ),
    p2: () => (
      <>
        <p className="sv-q">{c.p2}</p>
        <p className="sv-hint">{c.p2Hint}</p>
        {LANGS.map((l) => (
          <Item key={l.id} title={lang === 'zh' ? l.zh : (demands.find((d) => d.id === l.id)?.en ?? l.id)}>
            <Choices labels={c.interest} value={interestOf(l, a)} onPick={(v: number) => set({ langInterest: { ...a.langInterest, [l.id]: v } })} />
          </Item>
        ))}
      </>
    ),
    accept: () => (
      <>
        <p className="sv-q">{c.acceptIntro}</p>
        {(tier === 'sponsor' ? (['VL', 'SD', 'LA'] as const) : (['VL', 'SD'] as const)).map((k) => (
          <Item key={k} title={c.accept[k]}>
            <Choices labels={c.willing} value={a.accept[k]} onPick={(v: number) => set({ accept: { ...a.accept, [k]: v } })} />
          </Item>
        ))}
      </>
    ),
    dilemma: () => (
      <>
        <p className="sv-q">{c.dilemmaIntro}</p>
        {(['S1', 'S2', 'S3'] as const).map((s) => (
          <div className="sv-item" key={s}>
            <p>
              <b>{c.sideA}</b> {fill(c.dilemmas[s][0])}
            </p>
            <p>
              <b>{c.sideB}</b> {fill(c.dilemmas[s][1])}
            </p>
            <Choices labels={c.choices} values={SITUATIONS} value={a.S[s]} onPick={(v: number) => set({ S: { ...a.S, [s]: v } })} />
          </div>
        ))}
      </>
    ),
    confirm,
  }

  return (
    <I18n.Provider value={value}>
      <div className="exam exam--survey">
        <header className="exam__head">
          {at > 0 && <span className="exam__step">{`${at} / ${pages.length - 1}`}</span>}
          <strong>{c.title}</strong>
          <a className="exam__exit" href={home}>
            {c.back}
          </a>
        </header>
        <div className="exam__bar">
          <i style={{ transform: `scaleX(${at / Math.max(1, pages.length - 1)})` }} />
        </div>
        <main className="exam__body">
          <div className="sv-page">{body[page]()}</div>
          {page !== 'confirm' && (
            <div className="exam__row sv-nav">
              {at > 0 && (
                <button type="button" className="exam__btn exam__btn--quiet" onClick={() => setAt(at - 1)}>
                  {c.prev}
                </button>
              )}
              <button type="button" className="exam__btn" disabled={!ready} onClick={() => (last ? finish() : setAt(at + 1))}>
                {last ? c.finish : c.next}
              </button>
            </div>
          )}
        </main>
      </div>
    </I18n.Provider>
  )
}
