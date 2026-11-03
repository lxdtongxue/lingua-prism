// Explicit HTML targets work at both the domain root and a Pages repository path,
// including hosts that do not resolve directory indexes on return navigation.
export function centerPath(base: string, section: 'test' | 'lab' = 'test') {
  return `${base.replace(/\/?$/, '/')}center/index.html#${section}`
}
