import { useEffect, useRef } from 'react'

/**
 * 旋转光球组件。
 * 用 Canvas 2D + 'lighter' 混合模式绘制若干彩色光核，
 * 各自沿不同半径/速度旋转，叠加后自然形成流动感。
 *
 * 为什么不复用 WebGL 引擎：那是有状态单例（首页棱镜），
 * 这里抢上下文会留下两个实例。小尺寸 Canvas 2D 足够且零风险。
 */
type Props = {
  size?: number
  /** 静止 / 工作中 / 完成 */
  state?: 'idle' | 'busy' | 'done'
}

const COLORS = [
  [255, 95, 109],   // 珊瑚红
  [123, 108, 255],  // 紫
  [0, 212, 255],    // 青
  [67, 233, 123],   // 绿
  [255, 209, 102],  // 暖黄
]

export function Orb({ size = 84, state = 'busy' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const speed = state === 'busy' ? 1.75 : state === 'done' ? 0.55 : 0.14
    const boost = state === 'busy' ? 1 : state === 'done' ? 1.1 : 0.84

    let raf = 0
    const t0 = performance.now()

    const frame = (t: number) => {
      const e = ((t - t0) / 1000) * speed
      const cx = size / 2
      const cy = size / 2

      ctx.clearRect(0, 0, size, size)
      ctx.globalCompositeOperation = 'lighter'

      COLORS.forEach((rgb, i) => {
        const n = COLORS.length
        const phase = e * (0.7 + i * 0.17) + (i * Math.PI * 2) / n
        const wobble = Math.sin(e * 1.1 + i * 1.7)
        const orbit = size * (0.15 + 0.055 * wobble)
        const x = cx + Math.cos(phase) * orbit
        const y = cy + Math.sin(phase * 1.25) * orbit * 0.86
        const r = size * (0.32 + 0.11 * Math.sin(e * 0.9 + i * 1.3)) * boost

        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        const a = 0.52 * boost
        g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`)
        g.addColorStop(0.38, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.55})`)
        g.addColorStop(0.72, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.16})`)
        g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      })

      // 亮核：让中心更"发光"，而不是糊成一团
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.30)
      core.addColorStop(0, `rgba(255,255,255,${0.16 * boost})`)
      core.addColorStop(0.45, `rgba(255,255,255,${0.05 * boost})`)
      core.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(cx, cy, size * 0.30, 0, Math.PI * 2)
      ctx.fill()

      if (!reduced) raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [size, state])

  return (
    <span
      className={`orb orb--${state}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <canvas ref={ref} style={{ width: size, height: size, filter: 'blur(7px) saturate(1.18) brightness(1.08)' }} />
    </span>
  )
}

export const ORB_CSS = `
.orb{position:relative;display:inline-block;flex:none;border-radius:50%;
  filter:drop-shadow(0 0 20px rgba(123,108,255,.34)) drop-shadow(0 0 38px rgba(0,212,255,.20))}
.orb canvas{display:block;border-radius:50%;mix-blend-mode:screen}
.orb::after{content:'';position:absolute;inset:8%;border-radius:50%;
  background:radial-gradient(circle at 40% 36%,rgba(255,255,255,.36),transparent 58%);
  filter:blur(5px)}
.orb--busy{animation:orbPulse 1.25s ease-in-out infinite}
.orb--idle{animation:orbBreathe 6.5s ease-in-out infinite}
.orb--done{animation:orbPop .55s cubic-bezier(.22,1,.36,1) both}

@keyframes orbPulse{
  0%,100%{transform:scale(1);filter:brightness(1.02) saturate(1.06)}
  50%{transform:scale(1.05);filter:brightness(1.22) saturate(1.18)}
}
@keyframes orbBreathe{
  0%,100%{transform:scale(1);filter:brightness(.92)}
  50%{transform:scale(1.018);filter:brightness(1.04)}
}
@keyframes orbPop{
  0%{transform:scale(.9);opacity:.6}
  60%{transform:scale(1.08);opacity:1}
  100%{transform:scale(1);opacity:1}
}
@media (prefers-reduced-motion: reduce){
  .orb,.orb canvas{animation:none!important}
}
.ai__stage{display:flex;align-items:center;gap:22px;padding:10px 2px 4px}
.ai__stage__main{flex:1;min-width:0}
`
