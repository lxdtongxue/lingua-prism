// Preset avatars, drawn in code so they stay crisp at any size.
type Face = { bg: string; head: string; ear?: 'cat' | 'bunny' | 'bear' | 'none' | 'leaf' | 'tuft'; eyes: 'dot' | 'happy' | 'wink' | 'sleepy'; mouth: 'smile' | 'cat' | 'o' | 'beak'; patch?: boolean }

export const AVATARS: Face[] = [
  { bg: '#ffd7e2', head: '#fff4f6', ear: 'cat', eyes: 'dot', mouth: 'cat' },
  { bg: '#d9e7ff', head: '#ffffff', ear: 'bunny', eyes: 'happy', mouth: 'smile' },
  { bg: '#ffe6c7', head: '#c98b5a', ear: 'bear', eyes: 'dot', mouth: 'smile' },
  { bg: '#fff3b8', head: '#ffd84d', ear: 'tuft', eyes: 'dot', mouth: 'beak' },
  { bg: '#d6f5df', head: '#8edb9f', ear: 'none', eyes: 'happy', mouth: 'o' },
  { bg: '#e7dcff', head: '#ffffff', ear: 'bear', eyes: 'sleepy', mouth: 'smile', patch: true },
  { bg: '#ffdcc8', head: '#ff9a5c', ear: 'cat', eyes: 'wink', mouth: 'smile' },
  { bg: '#cdf1f4', head: '#f2fbfc', ear: 'leaf', eyes: 'dot', mouth: 'o' },
]

const INK = '#2b2530'

export function Avatar({ id, size = 40 }: { id: number; size?: number }) {
  const f = AVATARS[id] ?? AVATARS[0]
  const ears = {
    cat: <path d="M15 27 18 9 29 20ZM49 27 46 9 35 20Z" fill={f.head} />,
    bunny: <path d="M22 22C17 10 19 3 24 3S28 12 28 21ZM42 22C47 10 45 3 40 3S36 12 36 21Z" fill={f.head} />,
    bear: (
      <g fill={f.patch ? INK : f.head}>
        <circle cx="18" cy="19" r="7" />
        <circle cx="46" cy="19" r="7" />
      </g>
    ),
    tuft: <path d="M30 13C29 7 33 5 34 9 35 5 39 8 36 13Z" fill={f.head} />,
    leaf: <path d="M32 14C31 7 36 4 40 5 39 10 36 13 32 14Z" fill="#7fd08f" />,
    none: null,
  }[f.ear ?? 'none']
  const eyes = {
    dot: (
      <g fill={INK}>
        <circle cx="25" cy="34" r="2.6" />
        <circle cx="39" cy="34" r="2.6" />
      </g>
    ),
    happy: <path d="M22 35Q25 31 28 35M36 35Q39 31 42 35" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />,
    wink: (
      <g>
        <circle cx="25" cy="34" r="2.6" fill={INK} />
        <path d="M36 34Q39 31 42 34" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
    ),
    sleepy: <path d="M22 34Q25 37 28 34M36 34Q39 37 42 34" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />,
  }[f.eyes]
  const mouth = {
    smile: <path d="M29 40Q32 43 35 40" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />,
    cat: <path d="M28 40Q30 42.5 32 40Q34 42.5 36 40" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />,
    o: <ellipse cx="32" cy="41" rx="2.2" ry="2.6" fill={INK} />,
    beak: <path d="M28.5 39H35.5L32 43Z" fill="#ff9c3a" />,
  }[f.mouth]
  return (
    <svg className="avatar" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill={f.bg} />
      {ears}
      <circle cx="32" cy="36" r="17" fill={f.head} />
      {f.patch && (
        <g fill={INK}>
          <ellipse cx="25" cy="34" rx="5" ry="6" transform="rotate(-20 25 34)" />
          <ellipse cx="39" cy="34" rx="5" ry="6" transform="rotate(20 39 34)" />
        </g>
      )}
      {f.patch ? (
        <g fill="#fff">
          <circle cx="25" cy="34" r="1.6" />
          <circle cx="39" cy="34" r="1.6" />
        </g>
      ) : (
        eyes
      )}
      <g fill="#ff8fa8" opacity=".55">
        <ellipse cx="20.5" cy="40" rx="3" ry="2" />
        <ellipse cx="43.5" cy="40" rx="3" ry="2" />
      </g>
      {mouth}
    </svg>
  )
}
