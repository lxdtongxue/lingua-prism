import { createElement, useLayoutEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode, type RefObject } from 'react'
import { engine, type PaneOptions } from '../gl/engine'

type Props = PaneOptions &
  HTMLAttributes<HTMLElement> & {
    as?: string
    elRef?: RefObject<HTMLElement | null>
    children?: ReactNode
    href?: string
    type?: string
    disabled?: boolean
    style?: CSSProperties
  }

// A transparent DOM box. The engine paints real refraction behind it, so
// children stay crisp DOM text.
export function Glass({ as = 'div', elRef, radius = 28, bevel, depth, frost, dim, tint, reveal, press, shadow, delay, layer, force, className, style, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (elRef) elRef.current = ref.current
    return engine.register(ref.current!, { radius, bevel, depth, frost, dim, tint, reveal, press, shadow, delay, layer, force })
    // Glass options are fixed for the element's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return createElement(
    as,
    { ref, className: `glass${className ? ` ${className}` : ''}`, style: { '--radius': `${radius}px`, ...style }, ...rest },
    children,
  )
}
