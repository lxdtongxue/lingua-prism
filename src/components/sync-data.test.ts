import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeSnapshots, sameSnapshot, type Snapshot } from './sync-data.ts'
const base: Snapshot = { profile: { nickname: 'Lingua', avatar: 0 }, data: { 'decision-state': { answers: { a: 1, b: 1 } } } }
test('merge independent device edits and prefer local on a same-field conflict', () => {
  const local = structuredClone(base), remote = structuredClone(base)
  local.profile.nickname = 'Local'
  remote.profile.avatar = 2
  local.data['decision-state'] = { answers: { a: 2, b: 1 } }
  remote.data['decision-state'] = { answers: { a: 3, b: 2 } }
  assert.deepEqual(mergeSnapshots(base, local, remote), { profile: { nickname: 'Local', avatar: 2 }, data: { 'decision-state': { answers: { a: 2, b: 2 } } } })
})
test('completed test attempts remain atomic and newest wins', () => {
  const local = { ...base, data: { 'tall-results': { VL: { at: 100, score: 5, trials: [1] } } } }
  const remote = { ...base, data: { 'tall-results': { VL: { at: 200, score: 8, trials: [2] } } } }
  assert.deepEqual(mergeSnapshots(base, local, remote).data, remote.data)
})
test('metadata does not cause endless sync and unchanged local accepts deletion', () => {
  const cloud = { ...base, id: 'abc', revision: 3 }
  assert.ok(sameSnapshot(base, cloud))
  const remote = { ...base, data: {} }
  assert.deepEqual(mergeSnapshots(base, base, remote), remote)
  assert.ok(sameSnapshot(mergeSnapshots(base, base, cloud), base))
})
