import { asset } from './load'

// Web Audio plays decoded buffers, so a clip starts when asked instead of when the
// network catches up. The context must be created inside a click.
export class SoundBank {
  private ctx = new AudioContext()
  private buffers = new Map<string, AudioBuffer>()
  private playing = new Set<AudioBufferSourceNode>()

  async load(paths: string[], onProgress: (share: number) => void) {
    await this.ctx.resume()
    let done = 0
    await Promise.all(
      paths.map(async (p) => {
        if (this.buffers.has(p)) {
          onProgress(++done / paths.length)
          return
        }
        const r = await fetch(asset(p))
        if (!r.ok) throw new Error(`Could not load ${p}`)
        this.buffers.set(p, await this.ctx.decodeAudioData(await r.arrayBuffer()))
        onProgress(++done / paths.length)
      }),
    )
  }

  play(path: string) {
    const buffer = this.buffers.get(path)
    if (!buffer) return Promise.reject(new Error(`Not loaded: ${path}`))
    const node = this.ctx.createBufferSource()
    node.buffer = buffer
    node.connect(this.ctx.destination)
    this.playing.add(node)
    return new Promise<void>((resolve) => {
      node.onended = () => {
        this.playing.delete(node)
        resolve()
      }
      node.start()
    })
  }

  stop() {
    this.playing.forEach((n) => n.stop())
  }

  close() {
    this.playing.clear()
    void this.ctx.close()
  }
}
