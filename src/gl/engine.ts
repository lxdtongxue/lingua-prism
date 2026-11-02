import { drawAtlas } from './atlas'
import {
  BG_FS,
  DOWN_FS,
  GLASS_RECT_FS,
  GLASS_TRI_FS,
  PANE_VS,
  QUAD_VS,
  SCENE_FS,
  UP_FS,
} from './shaders'

export type RGB = [number, number, number]
export type PaneOptions = {
  radius?: number
  bevel?: number
  depth?: number
  frost?: number
  dim?: number
  tint?: [number, number, number, number]
  reveal?: boolean
  press?: boolean
  shadow?: number
  delay?: number
  layer?: number
  force?: boolean
}

type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }
type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }

class Spring {
  x: number
  v = 0
  target: number
  constructor(x = 0, public k = 170, public c = 22) {
    this.x = x
    this.target = x
  }
  step(dt: number) {
    const a = -this.k * (this.x - this.target) - this.c * this.v
    this.v += a * dt
    this.x += this.v * dt
  }
  get resting() {
    return Math.abs(this.x - this.target) < 0.001 && Math.abs(this.v) < 0.001
  }
}
export { Spring }

type Pane = {
  el: HTMLElement
  o: Required<PaneOptions>
  near: boolean
  x: number
  y: number
  w: number
  h: number
  revealed: boolean
  styled: boolean
  revealAt: number
  rev: Spring
  press: Spring
  hover: Spring
  ptrS: Spring
  rip: { x: number; y: number; age: number; amp: number }
  parent?: Pane | null
  inPage?: boolean
}

const POOL_GAIN = 1.12
const STEER_REST_MS = 700
const QUALITY = [
  { dpr: 2, scene: 0.72 },
  { dpr: 1.6, scene: 0.62 },
  { dpr: 1.3, scene: 0.55 },
  { dpr: 1, scene: 0.5 },
  { dpr: 0.8, scene: 0.45 },
]

const OVERSCAN = 280
const DEG = Math.PI / 180
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const mix = (a: number, b: number, t: number) => a + (b - a) * t

export const RAY_COLORS: RGB[] = [
  [1.0, 0.27, 0.34], // P
  [1.0, 0.68, 0.2], // G
  [0.2, 0.95, 0.62], // R
  [0.25, 0.72, 1.0], // T
  [0.6, 0.45, 1.0], // A
]

class Engine {
  gl: WebGL2RenderingContext | null = null
  canvas: HTMLCanvasElement | null = null
  stage: HTMLElement | null = null
  private panes = new Set<Pane>()
  private byEl = new Map<HTMLElement, Pane>()
  private ticks = new Set<(dt: number, t: number) => void>()
  private io: IntersectionObserver | null = null
  private raf = 0
  private last = 0
  private time = 0
  private running = false
  reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  // Phones page sideways instead of scrolling, so the canvas stays put and the
  // scene is offset per page.
  pager = false
  private pagePos = 0
  private pageAlpha = new Spring(1, 110, 21)

  // Pipeline state.
  private prog!: Record<'scene' | 'down' | 'up' | 'bg' | 'rect' | 'tri', Program>
  private vao: WebGLVertexArrayObject | null = null
  private scene: Target | null = null
  private downs: Target[] = []
  private ups: Target[] = []
  private textTex: WebGLTexture | null = null
  private textA = new Spring(0, 40, 14)
  private rayGain = RAY_COLORS.map(() => new Spring(1, 40, 13))

  private cssW = 0
  private cssH = 0
  private vh = 0
  private lvh = 0
  private pxScale = 1
  private sceneScale = 0.6
  private tier = 0
  private bestDt = 1 / 60
  private frames = 0
  private slowSum = 0
  private goodFor = 0
  private upgrades = 0
  private floorTier = 0
  private calibrated = false

  // Interaction state.
  private ptr = { x: -1e4, y: -1e4, inside: false, touch: false, down: false }
  private lightX = new Spring(0, 34, 11)
  private lightY = new Spring(0, 34, 11)
  private idle = 0

  // Hero prism.
  heroEl: HTMLElement | null = null
  private steer = new Spring(0, 26, 9)
  private steerInput = 0
  private movedAt = 0
  private introT = 0
  private introStart = -1
  private introHeld = false
  private rotS = new Spring(0, 30, 9)
  private prismFade = new Spring(0, 30, 12)
  private heroPress = new Spring(0, 200, 20)

  // Ambient pools, placed against sections.
  private pools: { el: HTMLElement | null; page: number; x: number; dy: number; r: number; a: number; c: RGB; cs: [Spring, Spring, Spring] }[] = []
  accent: RGB = [0.25, 0.72, 1]

  get ready() {
    return !!this.gl
  }

  private get overscan() {
    return this.pager ? 0 : OVERSCAN
  }

  mount(stage: HTMLElement, canvas: HTMLCanvasElement) {
    this.stage = stage
    this.canvas = canvas
    this.initGL()
    this.observe()
    window.addEventListener('pointermove', this.onMove, { passive: true })
    window.addEventListener('pointerdown', this.onDown, { passive: true })
    window.addEventListener('pointerup', this.onUp, { passive: true })
    window.addEventListener('pointercancel', this.onUp, { passive: true })
    document.addEventListener('pointerleave', this.onLeave)
    window.addEventListener('resize', this.onResize, { passive: true })
    document.addEventListener('visibilitychange', this.onVis)
    canvas.addEventListener('webglcontextlost', this.onLost)
    canvas.addEventListener('webglcontextrestored', this.onRestored)
    this.onResize()
    this.start()
    if (this.gl) this.loadAtlas()
  }

  unmount() {
    cancelAnimationFrame(this.raf)
    this.running = false
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    document.removeEventListener('pointerleave', this.onLeave)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVis)
    this.canvas?.removeEventListener('webglcontextlost', this.onLost)
    this.canvas?.removeEventListener('webglcontextrestored', this.onRestored)
    this.io?.disconnect()
  }

  // ---- Public API -----------------------------------------------------

  onFrame(fn: (dt: number, t: number) => void) {
    this.ticks.add(fn)
    return () => {
      this.ticks.delete(fn)
    }
  }

  register(el: HTMLElement, opts: PaneOptions = {}) {
    const o: Required<PaneOptions> = {
      radius: 28,
      bevel: 20,
      depth: 1,
      frost: 0.8,
      dim: 0.6,
      tint: [0, 0, 0, 0],
      reveal: true,
      press: false,
      shadow: 1,
      delay: 0,
      layer: 0,
      force: false,
      ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)),
    }
    const showNow = !o.force && (!o.reveal || this.reduced || this.pager)
    const pane: Pane = {
      el,
      o,
      near: false,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      revealed: showNow,
      styled: !showNow,
      revealAt: 0,
      rev: new Spring(showNow ? 1 : 0, 120, 19),
      press: new Spring(0, 520, 30),
      hover: new Spring(0, 110, 20),
      ptrS: new Spring(0, 120, 20),
      rip: { x: 0, y: 0, age: 9, amp: 0 },
    }
    if (!showNow) {
      el.style.opacity = '0'
      el.style.willChange = 'transform, opacity'
    }
    this.panes.add(pane)
    this.byEl.set(el, pane)
    this.io?.observe(el)
    if (o.press) el.addEventListener('pointerdown', this.onPanePress, { passive: true })
    return () => {
      this.panes.delete(pane)
      this.byEl.delete(el)
      this.io?.unobserve(el)
      el.removeEventListener('pointerdown', this.onPanePress)
    }
  }

  setPools(list: { el: HTMLElement | null; page: number; x: number; dy: number; r: number; a: number; c: RGB }[]) {
    this.pools = list.map((p) => ({
      ...p,
      cs: [new Spring(p.c[0], 40, 13), new Spring(p.c[1], 40, 13), new Spring(p.c[2], 40, 13)],
    }))
  }

  setPoolColor(i: number, c: RGB) {
    const p = this.pools[i]
    if (!p) return
    p.cs[0].target = c[0]
    p.cs[1].target = c[1]
    p.cs[2].target = c[2]
  }

  holdIntro() {
    this.introHeld = true
  }

  releaseIntro() {
    this.introHeld = false
  }

  setPager(on: boolean) {
    if (on === this.pager) return
    this.pager = on
    if (on) {
      for (const p of this.panes) {
        p.revealed = true
        p.rev.x = p.rev.target = 1
      }
    } else this.pagePos = 0
    if (!this.canvas) return
    this.cssW = 0
    this.onResize()
  }

  // A detail sheet takes over the stage, so the page's own glass steps aside.
  setPageAlpha(a: number, snap = false) {
    this.pageAlpha.target = a
    if (snap) this.pageAlpha.x = a
  }

  dismiss(el: HTMLElement) {
    const p = this.byEl.get(el)
    if (!p) return
    p.revealed = true
    p.rev.target = 0
    p.rev.k = 280
    p.rev.c = 30
  }

  setPage(pos: number) {
    this.pagePos = pos
  }

  // Index follows RAY_COLORS; -1 evens all five out again.
  focusRay(i: number) {
    this.rayGain.forEach((g, n) => {
      g.target = i < 0 ? 1 : n === i ? 2.1 : 0.42
    })
  }

  setSteer(v: number) {
    this.steerInput = clamp(v, -1, 1)
  }

  // Dev only: renders synchronously and waits for the GPU, so the numbers hold
  // even when the browser is throttling requestAnimationFrame.
  bench(n = 30) {
    const gl = this.gl
    if (!gl) return null
    const px = new Uint8Array(4)
    const run = () => {
      const t0 = performance.now()
      for (let i = 0; i < n; i++) {
        this.time += 1 / 60
        this.stepPanes(1 / 60, performance.now())
        this.draw(1 / 60)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
      }
      return +((performance.now() - t0) / n).toFixed(2)
    }
    const before = this.tier
    const res: Record<string, number> = {}
    for (let i = 0; i < QUALITY.length; i++) {
      this.setTier(i)
      res[`tier${i}_ms`] = run()
    }
    this.setTier(before)
    return { ...res, canvas: [this.canvas!.width, this.canvas!.height], scene: [this.scene!.w, this.scene!.h], tier: this.tier }
  }

  // Dev only: advances springs synchronously so screenshots show settled UI.
  settle(n = 180) {
    const now = performance.now()
    for (let i = 0; i < n; i++) {
      for (const fn of this.ticks) fn(1 / 60, this.time)
      this.stepPanes(1 / 60, now + 1e5)
    }
    if (this.gl) this.draw(0)
  }

  // ---- Lifecycle ------------------------------------------------------

  private onVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.running = false
    } else this.start()
  }

  private onLost = (e: Event) => {
    e.preventDefault()
    this.gl = null
    document.documentElement.classList.add('no-gl')
  }

  private onRestored = () => {
    this.initGL()
    this.resizeGL()
    if (this.gl) {
      document.documentElement.classList.remove('no-gl')
      this.loadAtlas()
    }
  }

  private start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  private observe() {
    this.io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          const p = this.byEl.get(e.target as HTMLElement)
          if (!p) continue
          p.near = e.isIntersecting
        }
      },
      { rootMargin: '32% 0px 32% 0px' },
    )
    for (const p of this.panes) this.io.observe(p.el)
  }

  // ---- GL setup -------------------------------------------------------

  private compile(vs: string, fs: string, names: string[]): Program {
    const gl = this.gl!
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link')
    const u: Program['u'] = {}
    for (const n of names) u[n] = gl.getUniformLocation(p, n)
    return { p, u }
  }

  private initGL() {
    const c = this.canvas!
    const gl = c.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    })
    if (!gl) {
      document.documentElement.classList.add('no-gl')
      return
    }
    this.gl = gl
    try {
      const sceneU = [
        'uCss', 'uDocTop', 'uDocLeft', 'uT', 'uVH', 'uE', 'uX', 'uIn', 'uFan', 'uSpread', 'uI1', 'uI2', 'uHero', 'uPR', 'uC',
        'uPool', 'uPoolC', 'uRay', 'uRayG', 'uTxt', 'uTxtA', 'uTxtLod', 'uTxtSoft', 'uRowH',
      ]
      const glassU = [
        'uQuad', 'uRes', 'uRect', 'uRadius', 'uBevel', 'uDepth', 'uFrost', 'uDim', 'uAlpha', 'uPx', 'uHover', 'uShadow',
        'uTint', 'uLight', 'uPtr', 'uRip', 'uT', 'uScene', 'uBlur', 'uRot',
      ]
      this.prog = {
        scene: this.compile(QUAD_VS, SCENE_FS, sceneU),
        down: this.compile(QUAD_VS, DOWN_FS, ['uTex', 'uTexel']),
        up: this.compile(QUAD_VS, UP_FS, ['uTex', 'uTexel']),
        bg: this.compile(QUAD_VS, BG_FS, ['uScene', 'uBlur', 'uCss', 'uDocTop', 'uFloor', 'uFloorFade', 'uT', 'uHero', 'uDocLeft', 'uVH', 'uE', 'uX', 'uIn', 'uFan', 'uSpread', 'uI1', 'uI2', 'uPR', 'uRay']),
        rect: this.compile(PANE_VS, GLASS_RECT_FS, glassU),
        tri: this.compile(PANE_VS, GLASS_TRI_FS, glassU),
      }
    } catch (err) {
      console.error('[glass] shader failed, using CSS fallback', err)
      this.gl = null
      document.documentElement.classList.add('no-gl')
      return
    }
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const blank = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, blank)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
    this.textTex = blank
  }

  private async loadAtlas() {
    try {
      await Promise.allSettled([
        document.fonts.load('500 60px "HarmonyOS Sans"', 'Hello'),
        document.fonts.load('400 60px "HarmonyOS Sans Naskh Arabic"', 'مرحبا'),
        document.fonts.load('500 60px "HarmonyOS Sans SC"', '你好こん'),
      ])
    } catch {
      /* fall through with whatever fonts exist */
    }
    const gl = this.gl
    if (!gl) return
    const big = matchMedia('(min-width: 900px)').matches
    const art = drawAtlas(big ? 2048 : 1024)
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, art)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.textTex = t
    this.textA.target = 1
  }

  private target(w: number, h: number, old?: Target): Target {
    const gl = this.gl!
    if (old) {
      gl.deleteTexture(old.tex)
      gl.deleteFramebuffer(old.fbo)
    }
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { fbo, tex, w, h }
  }

  private onResize = () => {
    const probe = document.getElementById('lvh-probe')
    this.vh = window.innerHeight
    const lvh = probe ? probe.getBoundingClientRect().height : window.innerHeight
    const w = document.documentElement.clientWidth
    // Mobile address-bar changes only alter vh; the canvas keeps its size.
    if (w === this.cssW && Math.abs(lvh - this.lvh) < 2 && this.gl && this.scene) return
    this.cssW = w
    this.lvh = lvh
    this.cssH = Math.ceil(lvh + this.overscan * 2)
    this.resizeGL()
  }

  private resizeGL() {
    const gl = this.gl
    const c = this.canvas
    if (!gl || !c) return
    const q = QUALITY[this.tier]
    const dpr = Math.min(window.devicePixelRatio || 1, q.dpr)
    this.pxScale = dpr
    this.sceneScale = q.scene
    const pw = Math.round(this.cssW * dpr)
    const ph = Math.round(this.cssH * dpr)
    c.width = pw
    c.height = ph
    c.style.width = `${this.cssW}px`
    c.style.height = `${this.cssH}px`
    const sw = Math.max(2, Math.round(pw * q.scene))
    const sh = Math.max(2, Math.round(ph * q.scene))
    this.scene = this.target(sw, sh, this.scene ?? undefined)
    const sizes = [2, 4, 8, 16].map((d) => [Math.max(2, sw >> Math.log2(d)), Math.max(2, sh >> Math.log2(d))])
    sizes.forEach(([w, h], i) => {
      this.downs[i] = this.target(w, h, this.downs[i])
    })
    sizes.slice(0, -1).forEach(([w, h], i) => {
      this.ups[i] = this.target(w, h, this.ups[i])
    })
  }

  private setTier(next: number) {
    if (next === this.tier) return
    this.tier = next
    this.resizeGL()
  }

  // Picks a starting tier from measured GPU time, which unlike requestAnimationFrame
  // gaps can't be fooled by a throttled tab.
  private calibrate() {
    const gl = this.gl
    if (!gl) return
    const px = new Uint8Array(4)
    const cost = () => {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
      const t0 = performance.now()
      for (let i = 0; i < 2; i++) {
        this.draw(0)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
      }
      return (performance.now() - t0) / 2
    }
    this.draw(0)
    while (this.tier < QUALITY.length - 1 && cost() > 8.5) this.setTier(this.tier + 1)
    this.floorTier = this.tier
  }

  private monitor(dt: number) {
    // Gaps this long mean a throttled or hidden tab, not a slow GPU. The first
    // seconds are also ignored: font parsing can stall the main thread.
    if (dt > 0.25 || this.time < 2.5) return
    if (dt < this.bestDt) this.bestDt = Math.max(dt, 1 / 144)
    this.frames++
    if (dt > this.bestDt * 1.38) this.slowSum++
    if (this.frames >= 48) {
      const slowRatio = this.slowSum / this.frames
      if (slowRatio > 0.28 && this.tier < QUALITY.length - 1) {
        this.setTier(this.tier + 1)
        this.goodFor = 0
      } else if (slowRatio < 0.04) {
        this.goodFor += 1
        if (this.goodFor > 12 * 2 ** this.upgrades && this.tier > this.floorTier) {
          this.upgrades++
          this.goodFor = 0
          this.setTier(this.tier - 1)
        }
      } else this.goodFor = 0
      this.frames = 0
      this.slowSum = 0
    }
  }

  // ---- Pointer --------------------------------------------------------

  private onMove = (e: PointerEvent) => {
    this.ptr.x = e.clientX
    this.ptr.y = e.clientY
    this.ptr.touch = e.pointerType !== 'mouse'
    if (e.type === 'pointermove') this.movedAt = performance.now()
    this.ptr.inside = e.pointerType === 'mouse' || this.ptr.down
    this.idle = 0
  }
  private onDown = (e: PointerEvent) => {
    this.ptr.x = e.clientX
    this.ptr.y = e.clientY
    this.ptr.down = true
    this.ptr.touch = e.pointerType !== 'mouse'
    this.ptr.inside = true
    this.idle = 0
    this.spawnRipple(e.clientX, e.clientY)
  }
  private onUp = (e: PointerEvent) => {
    this.ptr.down = false
    if (e.pointerType !== 'mouse') this.ptr.inside = false
    for (const p of this.panes) p.press.target = 0
    this.heroPress.target = 0
  }
  private onLeave = () => {
    this.ptr.inside = false
  }
  private onPanePress = (e: PointerEvent) => {
    const p = this.byEl.get(e.currentTarget as HTMLElement)
    if (p) p.press.target = 1
  }

  private spawnRipple(cx: number, cy: number) {
    let best: Pane | null = null
    let area = Infinity
    const sy = window.scrollY
    for (const p of this.panes) {
      if (!p.near) continue
      const y = p.y - sy
      if (cx >= p.x && cx <= p.x + p.w && cy >= y && cy <= y + p.h && p.w * p.h < area) {
        best = p
        area = p.w * p.h
      }
    }
    if (best) best.rip = { x: cx, y: cy + sy, age: 0, amp: 1 }
  }

  // ---- Frame ----------------------------------------------------------

  private frame = (now: number) => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.frame)
    let dt = (now - this.last) / 1000
    this.last = now
    const raw = dt
    dt = Math.min(dt, 1 / 24)
    this.time += this.reduced ? dt * 0.15 : dt
    // The intro follows the wall clock so a throttled tab still finishes it.
    const wall = now / 1000
    if (this.introStart < 0 && this.gl && !this.introHeld) this.introStart = wall + 0.05
    this.introT = this.reduced ? 3 : this.introStart < 0 ? 0 : Math.max(0, wall - this.introStart)

    for (const fn of this.ticks) fn(dt, this.time)
    this.stepPanes(dt, now)
    if (!this.gl) return
    if (!this.calibrated) {
      this.calibrated = true
      this.calibrate()
    }
    this.monitor(raw)
    this.draw(dt)
  }

  private stepPanes(dt: number, now: number) {
    const sy = window.scrollY
    const vh = this.vh
    if (this.pager) {
      // Observers can't see past the pager's clip, and a neighbouring page has to
      // be ready the moment a finger drags it in.
      const w = this.cssW
      for (const p of this.panes) {
        const r = p.el.getBoundingClientRect()
        p.near = r.width > 0 && r.right > -w * 0.1 && r.left < w * 1.1
      }
    }
    // Writes first, then reads, so we never force layout mid-frame.
    for (const p of this.panes) {
      if (!p.near) continue
      if (!p.revealed) {
        const r = p.el.getBoundingClientRect()
        const seen = r.top < vh * 0.9 && r.bottom > vh * 0.04
        if (seen) {
          if (!p.revealAt) p.revealAt = now + p.o.delay
          if (now >= p.revealAt) {
            p.revealed = true
            p.rev.target = 1
          }
        }
      }
      p.rev.step(dt)
      p.press.step(dt)
      const rv = clamp(p.rev.x, 0, 1.04)
      const moving = p.rev.x < 0.999 || !p.rev.resting || p.press.x > 0.002
      if (moving) {
        const s = (0.965 + 0.035 * rv) * (1 - 0.028 * p.press.x)
        p.el.style.transform = `translate3d(0,${((1 - rv) * 40).toFixed(2)}px,0) scale(${s.toFixed(4)})`
        p.el.style.opacity = clamp(rv, 0, 1).toFixed(3)
        if (!p.styled) p.el.style.willChange = 'transform, opacity'
        p.styled = true
      } else if (p.styled) {
        // Only undo what the engine wrote: some panes own their transform.
        p.el.style.transform = ''
        p.el.style.opacity = ''
        p.el.style.willChange = ''
        p.styled = false
      }
    }
    const inside = this.ptr.inside
    for (const p of this.panes) {
      if (!p.near) continue
      const r = p.el.getBoundingClientRect()
      p.x = r.left
      p.y = r.top + sy
      p.w = r.width
      p.h = r.height
      const over = inside && this.ptr.x >= r.left && this.ptr.x <= r.right && this.ptr.y >= r.top && this.ptr.y <= r.bottom
      p.hover.target = over ? 1 : 0
      p.ptrS.target = over ? (this.ptr.touch ? 1 : 0.55) : 0
      p.hover.step(dt)
      p.ptrS.step(dt)
      if (p.rip.amp > 0) {
        p.rip.age += dt
        p.rip.amp = Math.max(0, 1 - p.rip.age / 1.1)
      }
    }
  }

  private bindTarget(t: Target | null) {
    const gl = this.gl!
    if (t) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
      gl.viewport(0, 0, t.w, t.h)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, this.canvas!.width, this.canvas!.height)
    }
  }

  private tex(unit: number, t: WebGLTexture | null) {
    const gl = this.gl!
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
  }

  private draw(dt: number) {
    const gl = this.gl!
    if (!this.scene) return
    const sy = this.pager ? 0 : Math.max(0, window.scrollY)
    const docTop = sy - this.overscan
    const page = this.pager ? this.pagePos : 0
    const worldAt = (p: number): [number, number] => [p * this.cssW * 0.35, p * this.vh * 0.9]
    const [wx, wy] = worldAt(page)
    const t = this.time
    const canvas = this.canvas!
    canvas.style.transform = `translate3d(0,${docTop}px,0)`

    const aspect = this.cssW / Math.max(1, this.vh)
    const k = clamp((aspect - 0.6) / 0.7, 0, 1)

    // Hero geometry comes from a DOM anchor, so CSS owns the layout.
    let cx = this.cssW * 0.7
    let cy = this.vh * 0.4
    let R = 160
    let floor = this.vh * 0.6
    const hero = this.heroEl
    if (hero) {
      const r = hero.getBoundingClientRect()
      cx = r.left + r.width / 2
      cy = r.top + r.height / 2 + sy
      R = r.width / 2
    }
    // The prism stands on a mirror: the floor sits just under its base.
    const cxWorld = cx + wx
    const cyWorld = cy + wy
    if (hero) floor = cyWorld + R * 0.58

    this.pageAlpha.step(dt)
    const pageA = clamp(this.pageAlpha.x, 0, 1)
    const heroFade = (this.pager ? clamp(1 - Math.abs(page) * 1.5, 0, 1) : clamp(1 - sy / (this.vh * 1.5), 0, 1)) * pageA
    const sway = this.reduced ? 0 : Math.sin(t * 0.21) * 0.3 + Math.sin(t * 0.13 + 1.3) * 0.2

    // Mouse steers from anywhere over the hero; touch steers via setSteer().
    if (!this.ptr.touch && this.ptr.inside && sy < this.vh && page < 0.5) {
      this.steer.target = clamp((this.ptr.x / this.cssW - 0.5) * 2, -1, 1)
    } else {
      this.steer.target = this.steerInput !== 0 ? this.steerInput : sway
    }
    // A cursor that rests or leaves lets the beam drift back slowly; moving it again takes over at once.
    const steered = this.steerInput !== 0 || (!this.ptr.touch && this.ptr.inside && sy < this.vh && page < 0.5 && performance.now() - this.movedAt < STEER_REST_MS)
    if (!steered) this.steer.target = sway
    this.steer.k = steered ? 26 : 6
    this.steer.c = steered ? 9 : 4
    this.steer.step(dt)
    const st = this.steer.x

    const inA = (mix(36, 9, k) + st * 13) * DEG
    const fan = (mix(62, 17, k) + st * 18) * DEG
    const spread = (mix(5.2, 4.6, k) + Math.abs(st) * 0.9) * DEG
    const inDir: [number, number] = [Math.cos(inA), Math.sin(inA)]
    const e: [number, number] = [cxWorld - inDir[0] * R * 0.42, cyWorld - inDir[1] * R * 0.42]
    const x: [number, number] = [cxWorld + Math.cos(fan) * R * 0.42, cyWorld + Math.sin(fan) * R * 0.42]

    const i1 = this.reduced ? 1 : clamp(this.introT / 1.2, 0, 1)
    const i2 = this.reduced ? 1 : clamp((this.introT - 0.75) / 1.6, 0, 1)
    const ease = (v: number) => 1 - Math.pow(1 - v, 3)

    // Light drifts on its own for touch, follows the cursor for mouse.
    this.idle += dt
    let lx: number
    let ly: number
    if (this.ptr.inside) {
      lx = this.ptr.x
      ly = this.ptr.y
    } else {
      const a = t * 0.34 + sy * 0.0016 + page * 0.9
      lx = this.cssW * (0.5 + 0.46 * Math.cos(a))
      ly = this.vh * (0.42 + 0.46 * Math.sin(a * 0.8))
    }
    this.lightX.target = lx
    this.lightY.target = ly
    this.lightX.step(dt)
    this.lightY.step(dt)

    this.textA.step(dt)
    for (const p of this.pools) p.cs.forEach((s) => s.step(dt))

    // Scene ---------------------------------------------------------------
    const s = this.prog.scene
    this.bindTarget(this.scene)
    gl.disable(gl.BLEND)
    gl.useProgram(s.p)
    gl.uniform2f(s.u.uCss, this.cssW, this.cssH)
    gl.uniform1f(s.u.uDocTop, docTop + wy)
    gl.uniform1f(s.u.uDocLeft, wx)
    gl.uniform1f(s.u.uT, t)
    gl.uniform1f(s.u.uVH, this.vh)
    gl.uniform2f(s.u.uE, e[0], e[1])
    gl.uniform2f(s.u.uX, x[0], x[1])
    gl.uniform2f(s.u.uIn, inDir[0], inDir[1])
    gl.uniform2f(s.u.uC, cxWorld, cyWorld)
    gl.uniform1f(s.u.uPR, R)
    gl.uniform1f(s.u.uFan, fan)
    gl.uniform1f(s.u.uSpread, spread)
    gl.uniform1f(s.u.uI1, ease(i1))
    gl.uniform1f(s.u.uI2, ease(i2))
    gl.uniform1f(s.u.uHero, heroFade)
    const poolData = new Float32Array(32)
    const poolCol = new Float32Array(24)
    // Sized by screen area, so light floods neither a narrow phone nor leaves a wide monitor dark.
    const poolSize = Math.sqrt(this.cssW * this.vh)
    this.pools.slice(0, 8).forEach((p, i) => {
      const r = p.el?.getBoundingClientRect()
      // In pager mode every page starts at y = 0, so each page gets its own spot in the scene.
      const [px, py0] = this.pager ? worldAt(p.page) : [0, 0]
      const py = r ? r.top + sy + p.dy * r.height + py0 : 0
      const drift = Math.sin(t * 0.17 + i * 2.1) * 60
      // Pools on one sideways page overlap, so a crowded page shares its light out.
      const crowd = this.pager ? this.pools.filter((q) => q.page === p.page).length : 1
      const gain = POOL_GAIN * Math.min(1, 2 / crowd)
      poolData.set([p.x * this.cssW + px + drift, py + Math.cos(t * 0.14 + i) * 40, p.r * poolSize, p.a * gain], i * 4)
      poolCol.set([p.cs[0].x, p.cs[1].x, p.cs[2].x], i * 3)
    })
    gl.uniform4fv(s.u.uPool, poolData)
    gl.uniform3fv(s.u.uPoolC, poolCol)
    gl.uniform3fv(s.u.uRay, new Float32Array(RAY_COLORS.flat()))
    this.rayGain.forEach((g) => g.step(dt))
    gl.uniform1fv(s.u.uRayG, new Float32Array(this.rayGain.map((g) => g.x)))
    this.tex(0, this.textTex)
    gl.uniform1i(s.u.uTxt, 0)
    // Narrow screens stack body copy over the rays, so the words stay quieter there.
    gl.uniform1f(s.u.uTxtA, this.textA.x * mix(0.72, 1, clamp((this.cssW - 420) / 480, 0, 1)))
    const atlasRow = 2048 / 2 / 6
    const rowH = Math.min(this.vh * 0.125, this.cssW * 0.13 + 24)
    // Small type blurs into bands, so phones get a tighter blur.
    gl.uniform1f(s.u.uTxtSoft, mix(0.9, 2, clamp((this.cssW - 420) / 480, 0, 1)))
    gl.uniform1f(s.u.uRowH, rowH)
    gl.uniform1f(s.u.uTxtLod, Math.max(0, Math.log2(atlasRow / (rowH * this.pxScale * this.sceneScale))))
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // Blur chain ----------------------------------------------------------
    const dn = this.prog.down
    gl.useProgram(dn.p)
    gl.uniform1i(dn.u.uTex, 0)
    let src: Target = this.scene
    for (const d of this.downs) {
      this.bindTarget(d)
      this.tex(0, src.tex)
      gl.uniform2f(dn.u.uTexel, 1 / src.w, 1 / src.h)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      src = d
    }
    const up = this.prog.up
    gl.useProgram(up.p)
    gl.uniform1i(up.u.uTex, 0)
    for (let i = this.ups.length - 1; i >= 0; i--) {
      const d = this.ups[i]
      this.bindTarget(d)
      this.tex(0, src.tex)
      gl.uniform2f(up.u.uTexel, 0.5 / src.w, 0.5 / src.h)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      src = d
    }
    const blur = this.ups[0]

    // Background ----------------------------------------------------------
    const bg = this.prog.bg
    this.bindTarget(null)
    gl.useProgram(bg.p)
    this.tex(0, this.scene.tex)
    this.tex(1, blur.tex)
    gl.uniform1i(bg.u.uScene, 0)
    gl.uniform1i(bg.u.uBlur, 1)
    gl.uniform2f(bg.u.uCss, this.cssW, this.cssH)
    gl.uniform1f(bg.u.uDocTop, docTop + wy)
    gl.uniform1f(bg.u.uFloor, floor)
    gl.uniform1f(bg.u.uFloorFade, this.vh * 0.46)
    gl.uniform1f(bg.u.uT, t)
    gl.uniform1f(bg.u.uHero, heroFade)
    gl.uniform1f(bg.u.uDocLeft, wx)
    gl.uniform1f(bg.u.uVH, this.vh)
    gl.uniform2f(bg.u.uE, e[0], e[1])
    gl.uniform2f(bg.u.uX, x[0], x[1])
    gl.uniform2f(bg.u.uIn, inDir[0], inDir[1])
    gl.uniform1f(bg.u.uFan, fan)
    gl.uniform1f(bg.u.uSpread, spread)
    gl.uniform1f(bg.u.uI1, ease(i1))
    gl.uniform1f(bg.u.uI2, ease(i2))
    gl.uniform1f(bg.u.uPR, R)
    gl.uniform3fv(bg.u.uRay, new Float32Array(RAY_COLORS.flat()))
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // Glass ---------------------------------------------------------------
    gl.enable(gl.BLEND)
    const dpr = this.pxScale
    const lightPx: [number, number] = [this.lightX.x * dpr, (this.lightY.x + sy - docTop) * dpr]
    const ptrPx = (px: number, py: number): [number, number] => [px * dpr, (py + sy - docTop) * dpr]

    const setCommon = (g: Program) => {
      gl.useProgram(g.p)
      gl.uniform2f(g.u.uRes, canvas.width, canvas.height)
      gl.uniform1i(g.u.uScene, 0)
      gl.uniform1i(g.u.uBlur, 1)
      gl.uniform2f(g.u.uLight, lightPx[0], lightPx[1])
      gl.uniform1f(g.u.uPx, dpr)
      gl.uniform1f(g.u.uT, t)
    }

    if (hero && heroFade > 0.001) {
      this.rotS.target = st * 0.1
      this.rotS.step(dt)
      this.prismFade.target = i1 > 0.3 ? 1 : 0
      this.prismFade.step(dt)
      const g = this.prog.tri
      setCommon(g)
      const pad = (R + 60) * dpr
      const px = cx * dpr
      const py = (cy - docTop) * dpr
      gl.uniform4f(g.u.uQuad, px - pad, py - pad, pad * 2, pad * 2)
      gl.uniform4f(g.u.uRect, px, py, R * dpr, R * dpr)
      gl.uniform1f(g.u.uRadius, R * 0.075 * dpr)
      gl.uniform1f(g.u.uBevel, R * 0.34 * dpr)
      gl.uniform1f(g.u.uDepth, 1.25)
      gl.uniform1f(g.u.uFrost, 0.1)
      gl.uniform1f(g.u.uDim, 0.05)
      gl.uniform4f(g.u.uTint, 0.7, 0.78, 1, 0.022)
      gl.uniform1f(g.u.uAlpha, clamp(this.prismFade.x, 0, 1) * heroFade)
      gl.uniform1f(g.u.uHover, 0)
      gl.uniform1f(g.u.uShadow, 0.2)
      gl.uniform1f(g.u.uRot, this.rotS.x)
      gl.uniform3f(g.u.uPtr, -1e5, -1e5, 0)
      gl.uniform4f(g.u.uRip, 0, 0, 0, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const g = this.prog.rect
    setCommon(g)
    const ptr = ptrPx(this.ptr.x, this.ptr.y)
    // Children register before their parents, so stacking is explicit.
    const stack = [...this.panes].filter((p) => p.near).sort((a, b) => a.o.layer - b.o.layer)
    for (const p of stack) {
      if (p.parent === undefined) {
        const up = p.el.parentElement?.closest<HTMLElement>('.glass')
        p.parent = up ? (this.byEl.get(up) ?? null) : null
      }
      // Nested glass can't appear before the pane that holds it.
      if (p.inPage === undefined) p.inPage = !!p.el.closest('.page')
      const alpha = clamp(p.rev.x, 0, 1) * (p.parent ? clamp(p.parent.rev.x, 0, 1) : 1) * (p.inPage ? pageA : 1)
      if (alpha < 0.004) continue
      const py = p.y - docTop
      if (py + p.h < -60 || py > this.cssH + 60) continue
      const m = 90
      gl.uniform4f(g.u.uQuad, (p.x - m) * dpr, (py - m) * dpr, (p.w + m * 2) * dpr, (p.h + m * 2) * dpr)
      gl.uniform4f(g.u.uRect, (p.x + p.w / 2) * dpr, (py + p.h / 2) * dpr, (p.w / 2) * dpr, (p.h / 2) * dpr)
      gl.uniform1f(g.u.uRadius, p.o.radius * dpr)
      gl.uniform1f(g.u.uBevel, p.o.bevel * dpr)
      gl.uniform1f(g.u.uDepth, p.o.depth)
      gl.uniform1f(g.u.uFrost, p.o.frost)
      gl.uniform1f(g.u.uDim, p.o.dim)
      gl.uniform4f(g.u.uTint, p.o.tint[0], p.o.tint[1], p.o.tint[2], p.o.tint[3])
      gl.uniform1f(g.u.uAlpha, alpha)
      gl.uniform1f(g.u.uHover, clamp(p.hover.x, 0, 1))
      gl.uniform1f(g.u.uShadow, p.o.shadow)
      gl.uniform3f(g.u.uPtr, ptr[0], ptr[1], clamp(p.ptrS.x, 0, 1))
      const rip = ptrPx(p.rip.x, p.rip.y - sy)
      gl.uniform4f(g.u.uRip, rip[0], rip[1], p.rip.age, p.rip.amp)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
  }
}

export const engine = new Engine()

if (import.meta.env.DEV) (window as unknown as { __engine: Engine }).__engine = engine
