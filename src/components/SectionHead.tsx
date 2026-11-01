import { useReveal } from './useReveal'

export function SectionHead({ kicker, title, intro }: { kicker: string; title: string; intro?: string }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div className="head rise" ref={ref}>
      <p className="kicker">{kicker}</p>
      <h2>{title}</h2>
      {intro && <p className="lead">{intro}</p>}
    </div>
  )
}
