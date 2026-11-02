// Shape of public/tall/tall_items.json. See src/tall/README.md for how to fill it in.
export type Vl = {
  studySeconds: number
  items: { id: string; image: string; word: string }[]
}

type Phrase = { id: string; audio: string; sound: string }

export type Sd = {
  timeLimitSeconds: number
  highlightDelaySeconds: number
  audition: string
  sounds: { id: string; image: string; audio: string }[]
  lead: Phrase[]
  phraseSets: Phrase[][]
  items: { id: string; audio: string; answer: string; block?: number }[]
}

export type La = {
  studySeconds: number
  study: { id: string; image: string; text: string }[]
  items: { id: string; image: string; options: string[]; answer: number }[]
}

export type TallItems = { version: 1; placeholder: boolean; vl: Vl; sd: Sd; la: La }

export type Trial = { id: string; choice: string | null; correct: boolean; rtMs: number; timedOut?: boolean }

export const ORDER = ['VL', 'SD', 'LA'] as const
export type Sub = (typeof ORDER)[number]

export const VL_COUNT = 20
export const SD_SOUNDS = 3
export const SD_SETS = 4
export const SD_SET_SIZE = 3
export const SD_COUNT = 30
export const LA_STUDY = 20
export const LA_COUNT = 30
export const LA_OPTIONS = 4

export const scoreTrials = (trials: Trial[]) => trials.filter((t) => t.correct).length

export function shuffle<T>(list: readonly T[], random = Math.random): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Blocks run in number order, and each one is shuffled on its own.
export function orderByBlock<T extends { block?: number }>(items: readonly T[]) {
  const blocks = [...new Set(items.map((v) => v.block ?? 0))].sort((a, b) => a - b)
  return blocks.flatMap((b) => shuffle(items.filter((v) => (v.block ?? 0) === b)))
}

export function audioPaths(sd: Sd) {
  return [...new Set([sd.audition, ...sd.sounds.map((s) => s.audio), ...[...sd.lead, ...sd.phraseSets.flat()].map((p) => p.audio), ...sd.items.map((i) => i.audio)])]
}

// Reports every problem at once, so a mistake in the file names itself on load.
export function validateItems(d: TallItems): string[] {
  const errors: string[] = []
  const check = (ok: boolean, message: string) => {
    if (!ok) errors.push(message)
  }
  const unique = (ids: string[], where: string) => check(new Set(ids).size === ids.length, `${where}: duplicate ids`)
  const filled = (v: unknown) => typeof v === 'string' && v.length > 0

  check(d.version === 1, 'version must be 1')
  check(typeof d.placeholder === 'boolean', 'placeholder must be true or false')

  check(d.vl?.studySeconds > 0, 'vl.studySeconds must be positive')
  check(d.vl?.items?.length === VL_COUNT, `vl.items needs ${VL_COUNT} entries`)
  d.vl?.items?.forEach((v) => check(filled(v.id) && filled(v.image) && filled(v.word), `vl item ${v.id}: id, image and word are required`))
  unique(d.vl?.items?.map((v) => v.id) ?? [], 'vl.items')

  const sounds = new Set(d.sd?.sounds?.map((s) => s.id))
  check(d.sd?.timeLimitSeconds > 0, 'sd.timeLimitSeconds must be positive')
  check(filled(d.sd?.audition), 'sd.audition is required')
  check(d.sd?.sounds?.length === SD_SOUNDS, `sd.sounds needs ${SD_SOUNDS} entries`)
  check(sounds.size === d.sd?.sounds?.length, 'sd.sounds: duplicate ids')
  d.sd?.sounds?.forEach((s) => check(filled(s.image) && filled(s.audio), `sd sound ${s.id}: image and audio are required`))
  check(d.sd?.highlightDelaySeconds >= 0, 'sd.highlightDelaySeconds must be 0 or more')
  check(d.sd?.lead?.length === SD_SOUNDS, `sd.lead needs ${SD_SOUNDS} phrases`)
  d.sd?.lead?.forEach((p) => check(filled(p.audio) && sounds.has(p.sound), `sd phrase ${p.id}: audio and a known sound are required`))
  check(d.sd?.phraseSets?.length === SD_SETS, `sd.phraseSets needs ${SD_SETS} sets`)
  d.sd?.phraseSets?.forEach((set, i) => {
    check(set.length === SD_SET_SIZE, `sd.phraseSets[${i}] needs ${SD_SET_SIZE} phrases`)
    set.forEach((p) => check(filled(p.audio) && sounds.has(p.sound), `sd phrase ${p.id}: audio and a known sound are required`))
  })
  check(d.sd?.items?.length === SD_COUNT, `sd.items needs ${SD_COUNT} entries`)
  d.sd?.items?.forEach((v) => check(filled(v.audio) && sounds.has(v.answer), `sd item ${v.id}: audio and a known answer are required`))
  unique(d.sd?.items?.map((v) => v.id) ?? [], 'sd.items')
  d.sd?.sounds?.forEach((s) => {
    const n = d.sd.items?.filter((v) => v.answer === s.id).length
    check(n === SD_COUNT / SD_SOUNDS, `sd.items: sound ${s.id} appears ${n} times, expected ${SD_COUNT / SD_SOUNDS}`)
  })

  check(d.la?.studySeconds > 0, 'la.studySeconds must be positive')
  check(d.la?.study?.length === LA_STUDY, `la.study needs ${LA_STUDY} entries`)
  d.la?.study?.forEach((v) => check(filled(v.image) && filled(v.text), `la study ${v.id}: image and text are required`))
  check(d.la?.items?.length === LA_COUNT, `la.items needs ${LA_COUNT} entries`)
  d.la?.items?.forEach((v) => {
    check(filled(v.image), `la item ${v.id}: image is required`)
    check(v.options?.length === LA_OPTIONS && v.options.every(filled), `la item ${v.id}: needs ${LA_OPTIONS} options`)
    check(Number.isInteger(v.answer) && v.answer >= 0 && v.answer < LA_OPTIONS, `la item ${v.id}: answer must be an option index from 0 to ${LA_OPTIONS - 1}`)
  })
  unique(d.la?.items?.map((v) => v.id) ?? [], 'la.items')
  return errors
}
