import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'
import { engine } from '../gl/engine'
import { CHANCE_FLOOR, maxScore, type Ability } from '../a/score'
import { useI18n } from '../components/i18n'
import { saveResult } from '../components/tall'
import { SoundBank } from './audio'
import { audioPaths, LA_COUNT, orderByBlock, scoreTrials, SD_COUNT, shuffle, VL_COUNT, type La, type Sd, type TallItems, type Trial, type Vl } from './items'
import { asset, loadItems, preloadImages } from './load'

export const ORDER = ['VL', 'SD', 'LA'] as const satisfies readonly Ability[]

type Auto = 'off' | 'correct' | 'random' | 'wrong'
type Stage = 'intro' | 'check' | 'study' | 'ready' | 'test' | 'result'

// Development only: answers every trial so scoring can be checked in seconds.
let autoMode: Auto = 'off'

function autoChoice<T>(auto: Auto, choices: T[], correct: T) {
  if (auto === 'correct') return correct
  if (auto === 'wrong') return choices.find((c) => c !== correct) as T
  return choices[Math.floor(Math.random() * choices.length)]
}

function clock(seconds: number) {
  const s = Math.ceil(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// One trial after another. Reaction time runs from the first frame the trial is on screen.
function useRun<T extends { id: string }>(items: T[], onDone: (trials: Trial[]) => void) {
  const [i, setI] = useState(0)
  const trials = useRef<Trial[]>([])
  const onset = useRef(0)
  useLayoutEffect(() => {
    onset.current = performance.now()
    const id = requestAnimationFrame(() => {
      onset.current = performance.now()
    })
    return () => cancelAnimationFrame(id)
  }, [i])
  const answer = (choice: string | null, correct: boolean, timedOut = false) => {
    if (trials.current.length > i) return
    trials.current.push({ id: items[i].id, choice, correct, rtMs: Math.round(performance.now() - onset.current), ...(timedOut ? { timedOut } : {}) })
    if (i + 1 === items.length) onDone(trials.current)
    else setI(i + 1)
  }
  return { i, item: items[i], answer, onset }
}

function Bar({ share }: { share: number }) {
  return (
    <div className="exam__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
      <i style={{ transform: `scaleX(${share})` }} />
    </div>
  )
}

function Countdown({ seconds, auto, onEnd }: { seconds: number; auto: Auto; onEnd: () => void }) {
  const [left, setLeft] = useState(seconds)
  const end = useRef(onEnd)
  useLayoutEffect(() => {
    end.current = onEnd
  })
  useEffect(() => {
    if (auto !== 'off') {
      end.current()
      return
    }
    const deadline = performance.now() + seconds * 1000
    const id = window.setInterval(() => {
      const ms = deadline - performance.now()
      setLeft(Math.max(0, ms / 1000))
      if (ms <= 0) {
        window.clearInterval(id)
        end.current()
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [seconds, auto])
  return (
    <div className="exam__count">
      <div className="exam__bar exam__bar--time">
        <i style={{ transform: `scaleX(${left / seconds})` }} />
      </div>
      <output>{clock(left)}</output>
    </div>
  )
}

function VlStudy({ d, auto, onEnd }: { d: Vl; auto: Auto; onEnd: () => void }) {
  const [hover, setHover] = useState<string | null>(null)
  return (
    <>
      <Countdown seconds={d.studySeconds} auto={auto} onEnd={onEnd} />
      <div className="pics pics--20">
        {d.items.map((v) => (
          <div key={v.id} className="pic" tabIndex={0} onMouseEnter={() => setHover(v.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(v.id)} onBlur={() => setHover(null)}>
            <img src={asset(v.image)} alt="" draggable={false} />
            {hover === v.id && <span className="pic__word">{v.word}</span>}
          </div>
        ))}
      </div>
    </>
  )
}

function VlTest({ d, auto, onDone }: { d: Vl; auto: Auto; onDone: (t: Trial[]) => void }) {
  const layout = useMemo(() => shuffle(d.items), [d])
  const order = useMemo(() => shuffle(d.items), [d])
  const { i, item, answer } = useRun(order, onDone)
  const pick = (id: string) => answer(id, id === item.id)
  useEffect(() => {
    if (auto === 'off') return
    const id = window.setTimeout(() => pick(autoChoice(auto, order.map((v) => v.id), item.id)), 5)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, auto])
  return (
    <>
      <Bar share={i / order.length} />
      <p className="exam__word">{item.word}</p>
      <div className="pics pics--20">
        {layout.map((v, n) => (
          <button key={v.id} type="button" className="pic" aria-label={String(n + 1)} data-id={import.meta.env.DEV ? v.id : undefined} onClick={() => pick(v.id)}>
            <img src={asset(v.image)} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </>
  )
}

// `lit` highlights the picture that matches the sound.
function SoundPics({ sounds, lit, onPick }: { sounds: Sd['sounds']; lit?: string | null; onPick?: (id: string) => void }) {
  return (
    <div className="pics pics--3">
      {sounds.map((s, n) => (
        <button key={s.id} type="button" className={`pic${lit === s.id ? ' pic--lit' : ''}`} disabled={!onPick} aria-label={String(n + 1)} data-id={import.meta.env.DEV ? s.id : undefined} onClick={() => onPick?.(s.id)}>
          <img src={asset(s.image)} alt="" draggable={false} />
        </button>
      ))}
    </div>
  )
}

const SD_GAP_MS = 1000

function SdStudy({ d, bank, auto, onEnd }: { d: Sd; bank: SoundBank; auto: Auto; onEnd: () => void }) {
  // First the basic sounds and lead phrases in order, each lit at once. Then the
  // other phrases mixed together, with the answer lit after a short wait to think.
  const steps = useMemo(
    () => [
      ...d.sounds.map((s) => ({ audio: s.audio, sound: s.id, delay: 0, basic: true, pics: d.sounds })),
      ...d.lead.map((p) => ({ audio: p.audio, sound: p.sound, delay: 0, basic: false, pics: d.sounds })),
      ...shuffle(d.phraseSets.flat()).map((p) => ({ audio: p.audio, sound: p.sound, delay: d.highlightDelaySeconds * 1000, basic: false, pics: shuffle(d.sounds) })),
    ],
    [d],
  )
  const [at, setAt] = useState(0)
  const [lit, setLit] = useState<string | null>(null)
  const end = useRef(onEnd)
  useLayoutEffect(() => {
    end.current = onEnd
  })
  useEffect(() => {
    if (auto !== 'off') {
      end.current()
      return
    }
    let live = true
    const timers = new Set<number>()
    const wait = (ms: number) =>
      new Promise<void>((r) => {
        timers.add(window.setTimeout(r, ms))
      })
    const run = async () => {
      for (let n = 0; n < steps.length; n++) {
        const step = steps[n]
        setAt(n)
        setLit(step.delay ? null : step.sound)
        await Promise.all([
          bank.play(step.audio),
          wait(step.delay).then(() => {
            if (live) setLit(step.sound)
          }),
        ])
        await wait(SD_GAP_MS)
        if (!live) return
      }
      end.current()
    }
    void run()
    return () => {
      live = false
      timers.forEach((id) => window.clearTimeout(id))
      bank.stop()
    }
  }, [steps, bank, auto])
  const { t } = useI18n()
  const e = t.test.exam
  const step = steps[at]
  return (
    <>
      <Bar share={at / steps.length} />
      <p className="exam__word exam__word--small">{step.basic ? e.sdBasic : e.sdPhrases}</p>
      <SoundPics sounds={step.pics} lit={lit} />
    </>
  )
}

function SdTest({ d, bank, auto, onDone }: { d: Sd; bank: SoundBank; auto: Auto; onDone: (t: Trial[]) => void }) {
  const order = useMemo(() => orderByBlock(d.items), [d])
  const { i, item, answer, onset } = useRun(order, onDone)
  const latest = useRef(answer)
  useLayoutEffect(() => {
    latest.current = answer
  })
  // The clock for a trial starts with its sound, not with the page change.
  useEffect(() => {
    if (auto !== 'off') {
      const id = window.setTimeout(() => {
        const choice = autoChoice(auto, d.sounds.map((s) => s.id), item.answer)
        latest.current(choice, choice === item.answer)
      }, 5)
      return () => window.clearTimeout(id)
    }
    void bank.play(item.audio)
    onset.current = performance.now()
    const id = window.setTimeout(() => latest.current(null, false, true), d.timeLimitSeconds * 1000)
    return () => {
      window.clearTimeout(id)
      bank.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, auto])
  return (
    <>
      <Bar share={i / order.length} />
      <div className="exam__limit" key={i} style={{ animationDuration: `${d.timeLimitSeconds}s` }} />
      <SoundPics sounds={d.sounds} onPick={(id) => answer(id, id === item.answer)} />
    </>
  )
}

function LaStudy({ d, auto, onEnd }: { d: La; auto: Auto; onEnd: () => void }) {
  const [open, setOpen] = useState<number | null>(null)
  const item = open === null ? null : d.study[open]
  return (
    <>
      <Countdown seconds={d.studySeconds} auto={auto} onEnd={onEnd} />
      <div className="la">
        <div className="la__grid">
          {d.study.map((v, n) => (
            <button key={v.id} type="button" className={open === n ? 'on' : ''} onClick={() => setOpen(n)}>
              {n + 1}
            </button>
          ))}
        </div>
        <div className="la__card">
          {item && (
            <>
              <img src={asset(item.image)} alt="" draggable={false} />
              <p>{item.text}</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function LaTest({ d, auto, onDone }: { d: La; auto: Auto; onDone: (t: Trial[]) => void }) {
  // The sheet lists the right answer first, so the options are always reordered.
  const order = useMemo(() => shuffle(d.items).map((v) => ({ ...v, shown: shuffle(v.options.map((_, n) => n)) })), [d])
  const { i, item, answer } = useRun(order, onDone)
  const pick = (n: number) => answer(String(n), n === item.answer)
  useEffect(() => {
    if (auto === 'off') return
    const id = window.setTimeout(() => pick(autoChoice(auto, [0, 1, 2, 3], item.answer)), 5)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, auto])
  return (
    <>
      <Bar share={i / order.length} />
      <div className="la la--test">
        <div className="la__card">
          <img src={asset(item.image)} alt="" draggable={false} />
        </div>
        <div className="la__options">
          {item.shown.map((n) => (
            <button key={n} type="button" onClick={() => pick(n)}>
              {item.options[n]}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function SdCheck({ d, bank, placeholder, auto, onReady }: { d: Sd; bank: { current: SoundBank | null }; placeholder: boolean; auto: Auto; onReady: () => void }) {
  const { t } = useI18n()
  const e = t.test.exam
  const [state, setState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [share, setShare] = useState(0)
  const [heard, setHeard] = useState(false)
  const begin = async () => {
    setState('loading')
    setShare(0)
    try {
      bank.current ??= new SoundBank()
      await bank.current.load(audioPaths(d), setShare)
      setState('loaded')
      if (auto !== 'off') onReady()
    } catch {
      setState('error')
    }
  }
  return (
    <div className="exam__page">
      <h2>{e.checkTitle}</h2>
      <p>{e.checkBody}</p>
      {state === 'idle' && (
        <button type="button" className="exam__btn" onClick={begin}>
          {e.checkStart}
        </button>
      )}
      {state === 'loading' && (
        <>
          <Bar share={share} />
          <p className="exam__hint">{e.checkLoading}</p>
        </>
      )}
      {state === 'error' && (
        <>
          <p className="exam__warn">{e.checkFailed}</p>
          <button type="button" className="exam__btn" onClick={begin}>
            {e.retry}
          </button>
        </>
      )}
      {state === 'loaded' && (
        <div className="exam__row">
          <button
            type="button"
            className="exam__btn exam__btn--quiet"
            onClick={() => {
              void bank.current?.play(d.audition)
              setHeard(true)
            }}
          >
            {e.checkPlay}
          </button>
          <button type="button" className="exam__btn" disabled={!heard} onClick={onReady}>
            {e.checkOk}
          </button>
        </div>
      )}
      {state === 'loaded' && placeholder && <p className="exam__hint">{e.checkSilent}</p>}
    </div>
  )
}

function Shell({ title, placeholder, onExit, tools, children }: { title: string; placeholder: boolean; onExit?: () => void; tools?: ReactNode; children: ReactNode }) {
  const { t } = useI18n()
  const e = t.test.exam
  return (
    <div className="exam" role="dialog" aria-modal="true" aria-label={title}>
      <header className="exam__head">
        <strong>{title}</strong>
        {placeholder && <em className="tag tag--demo">{e.placeholder}</em>}
        {tools}
        {onExit && (
          <button type="button" className="exam__exit" onClick={onExit}>
            {e.exit}
          </button>
        )}
      </header>
      <main className="exam__body">{children}</main>
      <footer className="exam__foot">{e.credit}</footer>
    </div>
  )
}

type Props = { sub: (typeof ORDER)[number]; onNext: (sub: (typeof ORDER)[number]) => void; onClose: () => void; onFinish: () => void }

export function Exam({ sub, onNext, onClose, onFinish }: Props) {
  const { t } = useI18n()
  const c = t.test
  const e = c.exam
  const s = c.subs[sub]
  const [data, setData] = useState<TallItems | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('intro')
  const [score, setScore] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [mode, setMode] = useState(autoMode)
  const bank = useRef<SoundBank | null>(null)
  const auto: Auto = import.meta.env.DEV ? mode : 'off'
  const running = stage === 'study' || stage === 'ready' || stage === 'test' || stage === 'check'

  useEffect(() => {
    let live = true
    loadItems()
      .then(async (d) => {
        const images = sub === 'VL' ? d.vl.items.map((v) => v.image) : sub === 'SD' ? d.sd.sounds.map((v) => v.image) : [...d.la.study, ...d.la.items].map((v) => v.image)
        await preloadImages(images)
        if (live) setData(d)
      })
      .catch((err: Error) => {
        if (live) setFailure(err.message)
      })
    return () => {
      live = false
    }
  }, [sub])

  // The exam covers the canvas, so the engine stops competing with its timing.
  useEffect(() => {
    document.documentElement.classList.add('exam-on')
    engine.suspend(true)
    return () => {
      document.documentElement.classList.remove('exam-on')
      engine.suspend(false)
    }
  }, [])

  useEffect(
    () => () => {
      bank.current?.close()
      bank.current = null
    },
    [sub],
  )

  useEffect(() => {
    if (!running) return
    const warn = (ev: BeforeUnloadEvent) => ev.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [running])

  const finish = useCallback(
    (trials: Trial[]) => {
      const value = scoreTrials(trials)
      saveResult(sub, { score: value, max: maxScore(sub), trials, placeholder: data?.placeholder ?? false, at: Date.now() })
      setScore(value)
      setStage('result')
    },
    [sub, data],
  )

  const next = ORDER[ORDER.indexOf(sub) + 1]
  const start = () => setStage(sub === 'SD' ? 'check' : 'study')
  const floor = CHANCE_FLOOR[sub]
  const steps: Record<typeof sub, number> = { VL: VL_COUNT, SD: SD_COUNT, LA: LA_COUNT }

  let body: ReactNode = <p className="exam__hint">{failure ? `${e.loadFailed}\n${failure}` : e.loading}</p>
  if (data) {
    if (stage === 'intro') {
      body = (
        <div className="exam__page">
          <h2>{s.name}</h2>
          {s.steps.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="exam__hint">{e.noFeedback}</p>
          <button type="button" className="exam__btn" onClick={start}>
            {e.begin}
          </button>
        </div>
      )
    } else if (stage === 'check') {
      body = <SdCheck d={data.sd} bank={bank} placeholder={data.placeholder} auto={auto} onReady={() => setStage('study')} />
    } else if (stage === 'study') {
      if (sub === 'VL') body = <VlStudy d={data.vl} auto={auto} onEnd={() => setStage('test')} />
      else if (sub === 'LA') body = <LaStudy d={data.la} auto={auto} onEnd={() => setStage('test')} />
      else if (bank.current) body = <SdStudy d={data.sd} bank={bank.current} auto={auto} onEnd={() => setStage(auto === 'off' ? 'ready' : 'test')} />
    } else if (stage === 'ready') {
      body = (
        <div className="exam__page">
          <h2>{e.readyTitle}</h2>
          <p>{e.readyBody.replace('{n}', String(steps.SD)).replace('{s}', String(data.sd.timeLimitSeconds))}</p>
          <button type="button" className="exam__btn" onClick={() => setStage('test')}>
            {e.begin}
          </button>
        </div>
      )
    } else if (stage === 'test') {
      if (sub === 'VL') body = <VlTest d={data.vl} auto={auto} onDone={finish} />
      else if (sub === 'LA') body = <LaTest d={data.la} auto={auto} onDone={finish} />
      else if (bank.current) body = <SdTest d={data.sd} bank={bank.current} auto={auto} onDone={finish} />
    } else {
      body = (
        <div className="exam__page exam__page--result">
          <p className="exam__score">
            <b>{score}</b> / {maxScore(sub)}
          </p>
          <h2>{s.name}</h2>
          {floor != null && score <= floor && (
            <p className="exam__warn">
              <TriangleAlert size={16} strokeWidth={1.8} />
              {c.lowScore}
            </p>
          )}
          <div className="exam__row">
            {next ? (
              <button type="button" className="exam__btn" onClick={() => onNext(next)}>
                {e.nextSub.replace('{name}', c.subs[next].name)}
              </button>
            ) : (
              <button type="button" className="exam__btn" onClick={onFinish}>
                {e.toLab}
              </button>
            )}
            <button type="button" className="exam__btn exam__btn--quiet" onClick={onClose}>
              {e.back}
            </button>
          </div>
        </div>
      )
    }
  }

  const tools = import.meta.env.DEV ? (
    <label className="exam__auto">
      自动作答
      <select
        value={mode}
        onChange={(ev) => {
          autoMode = ev.target.value as Auto
          setMode(autoMode)
        }}
      >
        <option value="off">关</option>
        <option value="correct">全对</option>
        <option value="random">随机</option>
        <option value="wrong">全错</option>
      </select>
    </label>
  ) : null

  return createPortal(
    <>
      <Shell title={`${s.name} ${s.en}`} placeholder={data?.placeholder ?? false} tools={tools} onExit={stage === 'result' || stage === 'intro' || !data ? onClose : () => setLeaving(true)}>
        {body}
      </Shell>
      {leaving && (
        <div className="exam__confirm" role="alertdialog" aria-modal="true" aria-label={e.exitTitle}>
          <div>
            <h3>{e.exitTitle}</h3>
            <p>{e.exitBody}</p>
            <div className="exam__row">
              <button type="button" className="exam__btn" onClick={() => setLeaving(false)}>
                {e.stay}
              </button>
              <button type="button" className="exam__btn exam__btn--quiet" onClick={onClose}>
                {e.leave}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
