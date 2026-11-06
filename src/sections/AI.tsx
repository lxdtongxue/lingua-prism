import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../components/i18n'
import { SectionHead } from '../components/SectionHead'
import { Glass } from '../components/Glass'
import { Bot, GitBranch, Puzzle, BookOpen } from 'lucide-react'
import { useAiContext, type AiContext } from '../ai/context'
import { Orb, ORB_CSS } from '../ai/Orb'

type Explain = {
  headline?: string
  reasons?: { dimension: string; text: string }[]
  caveats?: string[]
  sources?: string[]
  _debug_url?: string
  _cached?: boolean
}

const CSS = `
.ai{position:relative}
.ai__grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));margin:26px 0 30px}
.ai__card{padding:18px 18px 16px}
.ai__card h4{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:15px;font-weight:600}
.ai__card h4 svg{width:17px;height:17px;opacity:.75}
.ai__card p{margin:0;font-size:13px;line-height:1.7;opacity:.72}
.ai__tag{display:inline-block;margin-top:10px;font-size:11px;letter-spacing:.06em;padding:3px 9px;border-radius:99px;border:1px solid rgba(255,255,255,.18);opacity:.7}
.ai__demo{padding:20px}
.ai__row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}
.ai__btn{cursor:pointer;border:0;border-radius:99px;padding:11px 22px;font-size:14px;font-weight:600;background:#eef1fa;color:#05060a}
.ai__btn--ghost{background:transparent;color:inherit;border:1px solid rgba(255,255,255,.22)}
.ai__btn:disabled{opacity:.5;cursor:default}
.ai__out{margin:0;font-size:14px;line-height:1.8;white-space:pre-wrap;word-break:break-word}
.ai__out b{font-weight:650}
.ai__meta{margin-top:12px;font-size:11.5px;opacity:.55;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.ai__li{display:flex;gap:9px;margin:7px 0;font-size:13.5px;line-height:1.7}
.ai__li i{font-style:normal;opacity:.55;min-width:16px}
.ai__warn{margin-top:10px;font-size:12.5px;opacity:.7;line-height:1.7;border-left:2px solid rgba(255,255,255,.25);padding-left:10px}
.ai__input{flex:1;min-width:200px;border:1px solid rgba(255,255,255,.18);background:transparent;color:inherit;border-radius:99px;padding:11px 18px;font-size:14px;outline:none}
.ai__input::placeholder{opacity:.45}
.ai__badge{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;letter-spacing:.05em;padding:4px 11px;border-radius:99px;border:1px solid rgba(255,255,255,.20);opacity:.85}
.ai__badge--demo{border-color:#c8862a;color:#e8b06a}
.ai__badge b{font-weight:650}
.ai__hours{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;opacity:.82;white-space:nowrap}
.ai__hours input{width:56px;border:1px solid rgba(255,255,255,.20);background:transparent;color:inherit;border-radius:99px;padding:6px 10px;font-size:13px;text-align:center;outline:none;font-variant-numeric:tabular-nums}
.ai__hours input::placeholder{opacity:.4}
.ai__hours input:focus{border-color:rgba(255,255,255,.42)}
.ai__stage{display:flex;align-items:center;gap:22px;padding:10px 2px 4px}
.ai__stage__main{flex:1;min-width:0}
.ai__load__head{display:flex;align-items:baseline;gap:10px;font-size:14px;font-weight:600}
.ai__load__time{margin-left:auto;font-variant-numeric:tabular-nums;opacity:.55;font-size:12px}
.ai__load__hint{margin:7px 0 12px;font-size:12px;opacity:.55;line-height:1.6}
/* Liquid Glass 光条：半透明玻璃 + 内外高光 + 流动镜面 + 光谱薄膜 */
/* Liquid Glass 光条：高通透度，让背景光线穿透 */
.ai__bar{position:relative;height:12px;border-radius:99px;overflow:hidden;
  background:rgba(255,255,255,.02);
  border:1px solid rgba(255,255,255,.10);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.14),
    inset 0 -1px 0 rgba(255,255,255,.05),
    0 1px 10px rgba(123,108,255,.08);
  backdrop-filter:blur(2px) saturate(1.4) brightness(1.06)}
/* 光谱色散：只在边缘可见，中间让位给背景 */
.ai__bar::before{content:'';position:absolute;inset:0;border-radius:99px;z-index:2;pointer-events:none;
  background:linear-gradient(100deg,rgba(255,95,109,.10),rgba(123,108,255,.14) 28%,rgba(0,212,255,.12) 55%,rgba(67,233,123,.10) 80%,rgba(255,209,102,.10));
  mix-blend-mode:screen}
/* 上沿细高光：勾出玻璃轮廓 */
.ai__bar::after{content:'';position:absolute;left:6%;right:6%;top:1px;height:1.5px;border-radius:99px;z-index:3;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent);
  filter:blur(.6px)}
/* 流动镜面：细而亮，不做大面积填充 */
.ai__bar i{position:absolute;top:0;bottom:0;width:34%;border-radius:99px;z-index:1;
  background:linear-gradient(105deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,.10) 35%,
    rgba(255,255,255,.42) 50%,
    rgba(255,255,255,.10) 65%,
    rgba(255,255,255,0) 100%);
  filter:blur(1px);
  transform:translateX(-140%);
  animation:lpSweep 2.1s cubic-bezier(.42,0,.58,1) infinite}
@keyframes lpSweep{
  0%{transform:translateX(-100%) skewX(-12deg)}
  100%{transform:translateX(100%) skewX(-12deg)}}
.ai__steps{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:12px;font-size:12px}
.ai__step{opacity:.32;transition:opacity .3s}
.ai__step--done{opacity:.7}
.ai__step--now{opacity:1;font-weight:600}
.ai__step i{font-style:normal;margin-right:5px}
.ai__fade{animation:lpFade .28s ease-out both}
@keyframes lpFade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.ai__bar i{animation:none!important;transform:translateX(130%)}.ai__fade{animation:none!important}}
`

const PARTS = [
  { icon: Bot, key: 'agent', tag: 'doubao-seed-2-0-pro' },
  { icon: GitBranch, key: 'workflow', tag: 'workflow_id 7704676842624532490' },
  { icon: Puzzle, key: 'plugin', tag: 'getUserScores' },
  { icon: BookOpen, key: 'kb', tag: 'TopK = 4' },
] as const

export function AI() {
  const { lang } = useI18n()
  const zh = lang === 'zh'
  const ctx: AiContext = useAiContext(!zh)
  const [hours, setHours] = useState('')
  const profile = {
    ...ctx.profile,
    weekly_hours: hours.trim() && Number(hours) > 0 ? Number(hours) : null,
  }
  const [busy, setBusy] = useState<'explain' | 'ask' | null>(null)
  const [data, setData] = useState<Explain | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!busy) {
      setElapsed(0)
      if (timer.current) window.clearInterval(timer.current)
      timer.current = null
      return
    }
    setElapsed(0)
    timer.current = window.setInterval(() => setElapsed((x) => x + 1), 1000)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
      timer.current = null
    }
  }, [busy])

  const L = zh
    ? {
        kicker: '项目简介 · 智能实现',
        title: '让解释，来自能被追查的地方',
        intro:
          '语棱的分数由本地算法算出，解释由扣子生成。四个部件各司其职：智能体负责对话，工作流负责结构化文案，插件负责读取真实成绩，知识库负责让每一句话都能回到出处。',
        cta: '生成一次解释',
        cta2: '向智能体提问',
        placeholder: '例如：这个分数能预测我学得会吗？',
        loading: '正在调用扣子…',
        failed: '调用失败，已降级为本地模板。',
        sources: '来源',
        ask: '智能体回答',
        demoHint: '以下内容由扣子实时生成，非预先写入的文案。',
        agent: '智能体',
        workflow: '工作流',
        plugin: '插件',
        kb: '知识库',
        hours: '每周可投入',
        hoursUnit: '小时',
        idleTitle: '语棱智能助手',
        idleHint: '点「生成一次解释」看推荐依据，或直接向智能体提问。',
        ready: '已完成',
        thinking: '智能体思考中',
        generating: '正在生成解释',
        slowHint: '还在处理中 —— 扣子首次响应较慢，已经在跑了',
        fastHint: '首次生成约 20 秒，之后命中缓存只要 2 秒',
        stepConnect: '连接扣子',
        stepRetrieve: '检索知识库',
        stepGenerate: '生成解释',
      }
    : {
        kicker: 'About · AI implementation',
        title: 'Explanations you can trace',
        intro:
          'Scores are computed locally; explanations are generated by Coze. Four parts play distinct roles: the agent holds the conversation, the workflow produces structured text, the plugin reads real scores, and the knowledge base keeps every claim tied to a source.',
        cta: 'Generate an explanation',
        cta2: 'Ask the agent',
        placeholder: 'e.g. Can this score predict how well I will learn?',
        loading: 'Calling Coze…',
        failed: 'Call failed. Fell back to the local template.',
        sources: 'Sources',
        ask: 'Agent reply',
        demoHint: 'Everything below is generated live by Coze, not pre-written copy.',
        agent: 'Agent',
        workflow: 'Workflow',
        plugin: 'Plugin',
        kb: 'Knowledge base',
        hours: 'Per week',
        hoursUnit: 'h',
        idleTitle: 'Lingua assistant',
        idleHint: 'Generate an explanation, or ask the agent directly.',
        ready: 'Ready',
        thinking: 'Thinking',
        generating: 'Generating explanation',
        slowHint: 'Still working - the first Coze call is slow',
        fastHint: 'First call takes about 20s; cached calls return in 2s',
        stepConnect: 'Connect Coze',
        stepRetrieve: 'Retrieve knowledge',
        stepGenerate: 'Generate',
      }

  async function explain() {
    setBusy('explain')
    setErr('')
    try {
      const r = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores: ctx.scores,
          weights: ctx.weights,
          profile,
          language: ctx.language,
          question: zh ? `为什么${ctx.language}排第一？` : `Why does ${ctx.languageEn} rank first?`,
          lang: zh ? 'zh' : 'en',
        }),
        signal: AbortSignal.timeout(30000),
      })
      if (!r.ok) throw new Error(String(r.status))
      setData((await r.json()) as Explain)
    } catch (e) {
      setErr(L.failed + ' ' + String((e as Error).message || e))
      setData(null)
    } finally {
      setBusy(null)
    }
  }

  async function ask() {
    const text = q.trim()
    if (!text || busy) return
    setBusy('ask')
    setErr('')
    setAnswer('')
    try {
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          scores: ctx.scores,
          weights: ctx.weights,
          profile,
          language: ctx.language,
          lang: zh ? 'zh' : 'en',
          user_id: 'site',
        }),
        signal: AbortSignal.timeout(60000),
      })
      if (!r.ok) throw new Error(String(r.status))
      const j = (await r.json()) as { answer?: string }
      setAnswer(j.answer || '')
    } catch (e) {
      setErr(L.failed + ' ' + String((e as Error).message || e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section id="ai" className="section ai">
      <style>{CSS + '\n' + ORB_CSS}</style>
      <div className="wrap">
        <SectionHead kicker={L.kicker} title={L.title} intro={L.intro} />

        <div className="ai__grid">
          {PARTS.map(({ icon: Icon, key, tag }, i) => (
            <Glass key={key} className="ai__card" radius={16} frost={0.25} dim={0.2} delay={i * 60}>
              <h4>
                <Icon aria-hidden="true" />
                {L[key]}
              </h4>
              <p>{desc(zh, key)}</p>
              <span className="ai__tag">{tag}</span>
            </Glass>
          ))}
        </div>

        <Glass className="ai__demo" radius={20} frost={0.3} dim={0.25} delay={240}>
          <div className="ai__row">
            {ctx.isDemo ? (
              <span className="ai__badge ai__badge--demo">
                ⚠ {zh ? '示例数据' : 'Demo data'} · {ctx.demoReason}
              </span>
            ) : (
              <span className="ai__badge">
                {zh ? '当前候选' : 'Current candidate'}：<b>{ctx.language}</b>
                {' · '}
                {zh ? '真实测评结果' : 'real results'}
              </span>
            )}
          </div>

          <div className="ai__stage">
            <Orb size={112} state={busy ? 'busy' : 'idle'} />
            <div className="ai__stage__main">
              {!busy && (
                <div>
                  <div className="ai__load__head">
                    <span>{L.idleTitle}</span>
                    {(data || answer) && <span className="ai__load__time">{L.ready}</span>}
                  </div>
                  <p className="ai__load__hint">{L.idleHint}</p>
                </div>
              )}
              {busy && (
                <>
                  <div className="ai__load__head">
                    <span>{busy === 'ask' ? L.thinking : L.generating}</span>
                    <span className="ai__load__time">{elapsed}s</span>
                  </div>
                  <p className="ai__load__hint">{elapsed >= 15 ? L.slowHint : L.fastHint}</p>
                  <div className="ai__bar"><i /></div>
                  {busy === 'explain' && (
                    <div className="ai__steps">
                      <span className="ai__step ai__step--now"><i>●</i>{L.stepConnect}</span>
                      <span className={`ai__step ${elapsed >= 6 ? 'ai__step--done' : ''}`}><i>{elapsed >= 6 ? '✓' : '○'}</i>{L.stepRetrieve}</span>
                      <span className={`ai__step ${elapsed >= 12 ? 'ai__step--now' : ''}`}><i>{elapsed >= 12 ? '●' : '○'}</i>{L.stepGenerate}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="ai__row">
            <button type="button" className="ai__btn" onClick={explain} disabled={busy !== null}>
              {busy === 'explain' ? L.loading : L.cta}
            </button>
            <span style={{ fontSize: 12.5, opacity: 0.6 }}>{L.demoHint}</span>
          </div>

          {err && <p className="ai__warn">{err}</p>}

          {data && (
            <div className="ai__fade">
              <p className="ai__out">
                <b>{data.headline}</b>
              </p>
              {(data.reasons || []).map((r, i) => (
                <p className="ai__li" key={i}>
                  <i>{r.dimension}</i>
                  <span>{r.text}</span>
                </p>
              ))}
              {(data.caveats || []).map((c, i) => (
                <p className="ai__warn" key={'c' + i}>
                  {c}
                </p>
              ))}
              {!!data.sources?.length && (
                <p className="ai__meta">
                  {L.sources}: {data.sources.join(' · ')}
                </p>
              )}
              {data._debug_url && (
                <p className="ai__meta">
                  <a href={data._debug_url} target="_blank" rel="noreferrer">
                    debug_url
                  </a>
                  {data._cached ? ' · cached' : ''}
                </p>
              )}
            </div>
          )}

          <div className="ai__row" style={{ marginTop: 18, alignItems: 'center' }}>
            <label className="ai__hours">
              {L.hours}
              <input
                type="number"
                min={0}
                max={80}
                step={0.5}
                inputMode="decimal"
                value={hours}
                placeholder="—"
                onChange={(e) => setHours(e.target.value)}
                aria-label={zh ? '每周可投入学习时间（小时）' : 'Weekly study hours'}
              />
              {L.hoursUnit}
            </label>
            <input
              className="ai__input"
              value={q}
              placeholder={L.placeholder}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
            />
            <button type="button" className="ai__btn ai__btn--ghost" onClick={ask} disabled={busy !== null || !q.trim()}>
              {busy === 'ask' ? L.loading : L.cta2}
            </button>
          </div>
          {answer && (
            <div className="ai__fade">
              <p className="ai__meta">{L.ask}</p>
              <p className="ai__out">{answer}</p>
            </div>
          )}
        </Glass>
      </div>
    </section>
  )
}

function desc(zh: boolean, key: string) {
  const map = zh
    ? {
        agent: '扣子编程构建的对话智能体，带滑动窗口记忆，回答分数问题前强制先查真实成绩，禁止编造。',
        workflow: '四节点编排：参数校验 → 知识库检索 → 大模型 → 结构化输出，返回可带出处的解释文案。',
        plugin: '自定义只读插件，读取 /api/public-profile 的五维分数与权重，返回值全部为字符串类型。',
        kb: '四份方法论文档：五维定义、数据许可、常见问题、局限声明，语义检索保证回答可追查。',
      }
    : {
        agent: 'A conversational agent built in Coze Coding with sliding-window memory. It must fetch real scores before answering and is forbidden from inventing any number.',
        workflow: 'Four nodes: input check → knowledge retrieval → large model → structured output. Returns an explanation that carries its sources.',
        plugin: 'A read-only custom plugin that fetches five-dimension scores and weights from /api/public-profile. Every field is a string.',
        kb: 'Four methodology documents covering dimension definitions, data licences, FAQ and limits. Semantic retrieval keeps every claim traceable.',
      }
  return map[key as 'agent']
}
