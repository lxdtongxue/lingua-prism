// The Chinese faces are about 8 MB each. On a slow link they would share bandwidth with the
// test materials, so the test page holds them back until the materials are in.
const root = document.documentElement

export const chineseFontHeld = () => root.classList.contains('fonts-late')
export const holdChineseFont = () => root.classList.add('fonts-late')

export function releaseChineseFont() {
  if (!chineseFontHeld()) return
  root.classList.remove('fonts-late')
  window.dispatchEvent(new Event('lp-fonts'))
}
