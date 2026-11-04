// Fixed percentage scale: the available budget caps input, not track geometry.
export function sliderShare(value: number) {
  return Math.max(0, Math.min(100, value)) / 100
}

export function sliderValue(x: number, width: number, thumbWidth: number, max: number) {
  if (width <= thumbWidth || max <= 0) return null
  return Math.min(max, Math.max(0, Math.round((x - thumbWidth / 2) / (width - thumbWidth) * 100)))
}
