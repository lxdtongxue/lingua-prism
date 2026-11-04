import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sliderShare, sliderValue } from './slider.ts'

test('the same percentage stays at the same position as the budget changes', () => {
  for (const max of [100, 80, 60, 20]) {
    assert.equal(sliderValue(23 + 0.2 * 200, 246, 46, max), 20)
  }
  assert.equal(sliderValue(223, 246, 46, 60), 60)
  assert.equal(sliderValue(223, 246, 46, 18.4), 18.4)
})

test('spring overshoot cannot draw a thumb outside the percentage track', () => {
  assert.equal(sliderShare(-10), 0)
  assert.equal(sliderShare(120), 1)
  assert.equal(sliderShare(20), 0.2)
  assert.equal(sliderShare(0), 0)
})

test('zero budget and collapsed tracks cannot change stored ratios', () => {
  assert.equal(sliderValue(100, 246, 46, 0), null)
  assert.equal(sliderValue(100, 0, 46, 60), null)
  assert.equal(sliderValue(100, 46, 46, 60), null)
  assert.equal(sliderValue(-100, 246, 46, 60), 0)
})
