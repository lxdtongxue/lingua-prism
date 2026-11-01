// Six rows of greetings drawn to a canvas, then used as a single-channel texture
// the scene lights up where the prism's rays pass.
const ROWS: string[][] = [
  ['你好', 'Hello', 'Bonjour', 'こんにちは', 'Hola', 'مرحبا', 'Привет', 'Ciao'],
  ['Xin chào', 'Guten Tag', 'Olá', '안녕하세요', 'Merhaba', 'Γειά σου', 'Cześć', 'Salut'],
  ['ありがとう', 'Thank you', 'Спасибо', 'Merci', '谢谢', 'شكرا', 'Danke', 'Gracias'],
  ['Hallo', 'Namaste', 'Здравствуйте', '你好', 'Hej', 'Ahoj', 'Sawubona', 'Aloha'],
  ['世界', 'World', 'Monde', '世界', 'Mundo', 'Мир', 'عالم', 'Welt'],
  ['语言', 'Language', 'Langue', '言語', 'Lengua', 'Язык', 'لغة', 'Sprache'],
]

const STACK =
  '"HarmonyOS Sans","HarmonyOS Sans SC","HarmonyOS Sans Naskh Arabic","Apple SD Gothic Neo","Noto Sans CJK KR",sans-serif'

export function drawAtlas(size = 2048): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size / 2
  const g = c.getContext('2d')!
  const rowH = c.height / ROWS.length
  g.fillStyle = '#000'
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#fff'
  g.textBaseline = 'middle'
  ROWS.forEach((words, r) => {
    g.font = `500 ${Math.round(rowH * 0.56)}px ${STACK}`
    const widths = words.map((w) => g.measureText(w).width)
    const total = widths.reduce((a, b) => a + b, 0)
    const gap = (c.width - total) / words.length
    let x = gap / 2
    words.forEach((w, i) => {
      g.fillText(w, x, rowH * (r + 0.54))
      x += widths[i] + gap
    })
  })
  return c
}
