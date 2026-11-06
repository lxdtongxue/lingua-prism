import type { ComponentType, ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Glass } from './Glass'

export const CLEAR = { bevel: 20, depth: 1.5, frost: 0.14, dim: 0.14 }

type Props = {
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>
  kicker?: string
  kickerSize?: 'sm' | 'lg'
  title: string
  desc?: string
  tone?: string
  delay?: number
  className?: string
  children?: ReactNode
  onOpen: () => void
}

// Outer layer of the two-level content: a short summary that opens a detail sheet.
export function Card({ icon: Icon, kicker, kickerSize, title, desc, tone, delay, className, children, onOpen }: Props) {
  return (
    <Glass as="button" type="button" className={`card${tone ? ` tone-${tone}` : ''}${className ? ` ${className}` : ''}`} radius={30} {...CLEAR} press delay={delay} onClick={onOpen}>
      {(Icon || kicker) && (
        <span className="card__top">
          {Icon && (
            <span className="card__icon">
              <Icon size={20} strokeWidth={1.7} />
            </span>
          )}
          {kicker && <span className={`micro${kickerSize === 'lg' ? ' micro--lg' : ''}`}>{kicker}</span>}
        </span>
      )}
      {children}
      <span className="card__text">
        <strong>{title}</strong>
        {desc && <span>{desc}</span>}
      </span>
      <span className="card__plus" aria-hidden="true">
        <Plus size={16} strokeWidth={2} />
      </span>
    </Glass>
  )
}
