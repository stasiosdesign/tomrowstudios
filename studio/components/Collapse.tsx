import {usePrefersReducedMotion} from '@sanity/ui'
import {useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode} from 'react'
import {styled} from 'styled-components'

/* Opens and closes a block of content by its height, smoothly: the grid
   0fr -> 1fr pattern, so no height is measured and nothing jumps. The content
   stays mounted through the close, then is removed; while it moves it is
   clipped, once open it is not (so focus rings and anything that overflows
   show). Instant for anyone who prefers reduced motion. Used by the page
   sections (SectionField); dropdowns use Sanity UI's own popover motion. */

export const MOTION_MS = 200
export const MOTION_EASE = 'cubic-bezier(0.2, 0, 0, 1)'

export function Collapse({open, children, ...rest}: {open: boolean; children: ReactNode} & HTMLAttributes<HTMLDivElement>) {
  const reduceMotion = usePrefersReducedMotion()
  const outer = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(open)
  const [expanded, setExpanded] = useState(open)
  const [settled, setSettled] = useState(open)
  // What to show while closing: the content as it was when open
  const lastOpen = useRef(children)
  if (open) lastOpen.current = children

  // Opening: mount closed, let the browser take that closed state in (a
  // style read), then open, all before the frame is drawn, so the transition
  // runs from 0 without waiting on animation frames
  useLayoutEffect(() => {
    if (open) setMounted(true)
  }, [open])
  useLayoutEffect(() => {
    if (!open || !mounted || expanded) return
    void outer.current?.offsetHeight
    setExpanded(true)
  }, [open, mounted, expanded])

  useEffect(() => {
    if (open) {
      if (settled) return undefined
      if (reduceMotion) {
        setSettled(true)
        return undefined
      }
      const timer = setTimeout(() => setSettled(true), MOTION_MS)
      return () => clearTimeout(timer)
    }
    setSettled(false)
    setExpanded(false)
    if (reduceMotion) {
      setMounted(false)
      return undefined
    }
    const timer = setTimeout(() => setMounted(false), MOTION_MS)
    return () => clearTimeout(timer)
  }, [open, reduceMotion, settled])

  if (!mounted) return null
  return (
    <Outer ref={outer} {...rest} data-expanded={expanded ? '' : undefined} data-settled={settled ? '' : undefined} aria-hidden={!open || undefined}>
      <Inner>{open ? children : lastOpen.current}</Inner>
    </Outer>
  )
}

const Outer = styled.div`
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows ${MOTION_MS}ms ${MOTION_EASE};

  &[data-expanded] {
    grid-template-rows: 1fr;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Inner = styled.div`
  min-height: 0;
  overflow: hidden;

  [data-settled] > & {
    overflow: visible;
  }
`
