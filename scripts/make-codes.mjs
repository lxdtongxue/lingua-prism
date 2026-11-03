// Adds random 8-digit sign-in codes. Only their hashes go into the site;
// the plain codes print here for the team to hand out.
//   node scripts/make-codes.mjs 50 >> ../登录代码.txt
import { createHash, randomInt } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = new URL('../public/codes.json', import.meta.url)
const hash = (c) => createHash('sha256').update(`lingua-prism:${c}`).digest('hex')
const n = Number(process.argv[2] ?? 50)
let list = []
try {
  list = JSON.parse(readFileSync(FILE, 'utf8'))
} catch {
  /* first run */
}
const taken = new Set(list)
const fresh = []
while (fresh.length < n) {
  const c = String(randomInt(1e8)).padStart(8, '0')
  if (taken.has(hash(c))) continue
  taken.add(hash(c))
  fresh.push(c)
}
writeFileSync(FILE, JSON.stringify([...taken].sort()) + '\n')
console.log(fresh.join('\n'))
