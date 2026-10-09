import {useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject} from 'react'
import {styled} from 'styled-components'

/* A scrollbar drawn over a scroll area's right edge instead of beside it, so
   the area keeps its full width whether or not it can scroll: opening a page
   section that makes the form taller no longer narrows every row by the
   width of a scrollbar.

   The Studio draws no scrollbars of its own (studio.css), and the area
   scrolls exactly as before (wheel, trackpad, touch, keyboard); this
   draws a slim thumb over the edge, only while there is something to scroll,
   kept in step with the position and the content's height, and draggable.
   It sits in the rows' right padding, clear of their arrows.

   `containerRef` is a positioned ancestor to draw in (DocumentLayout's root);
   the scroll area is found inside it by `selector`, again whenever Sanity
   replaces it. */

const INSET = 3 // from the area's top, bottom and right edge
const MIN_THUMB = 32

type Geometry = {top: number; right: number; height: number; thumbTop: number; thumbHeight: number}

export function OverlayScrollbar({containerRef, selector}: {containerRef: RefObject<HTMLElement | null>; selector: string}) {
  const [area, setArea] = useState<HTMLElement | null>(null)
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{startY: number; startScroll: number; ratio: number} | null>(null)

  // Find the scroll area, and find it again if Sanity renders a new one
  useEffect(() => {
    const root = containerRef.current
    if (!root) return undefined
    const find = () => {
      const next = root.querySelector<HTMLElement>(selector)
      setArea((current) => (current === next ? current : next))
    }
    find()
    const observer = new MutationObserver(find)
    observer.observe(root, {childList: true, subtree: true})
    return () => observer.disconnect()
  }, [containerRef, selector])

  // Keep the thumb in step with the position, the area's size and the content's height
  useEffect(() => {
    const root = containerRef.current
    if (!area || !root) return undefined
    const update = () => {
      const {scrollTop, scrollHeight, clientHeight} = area
      if (scrollHeight <= clientHeight + 1) {
        setGeometry(null)
        return
      }
      const areaBox = area.getBoundingClientRect()
      const rootBox = root.getBoundingClientRect()
      const track = clientHeight - INSET * 2
      const thumbHeight = Math.max(MIN_THUMB, (track * clientHeight) / scrollHeight)
      const thumbTop = INSET + ((track - thumbHeight) * scrollTop) / (scrollHeight - clientHeight)
      // Whole pixels, and never past the area's bottom edge
      const top = Math.ceil(areaBox.top - rootBox.top)
      const height = Math.max(0, Math.floor(Math.min(clientHeight, rootBox.bottom - rootBox.top - top)))
      setGeometry({top, right: Math.round(rootBox.right - areaBox.right), height, thumbTop, thumbHeight})
    }
    update()
    area.addEventListener('scroll', update, {passive: true})
    const resize = new ResizeObserver(update)
    const watch = () => {
      resize.disconnect()
      resize.observe(area)
      for (const child of Array.from(area.children)) resize.observe(child)
    }
    watch()
    const children = new MutationObserver(() => {
      watch()
      update()
    })
    children.observe(area, {childList: true})
    return () => {
      area.removeEventListener('scroll', update)
      resize.disconnect()
      children.disconnect()
    }
  }, [area, containerRef])

  if (!area || !geometry) return null

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    // Keeps the drag going when the pointer leaves the thumb; not essential
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // No active pointer to capture (a synthetic event): drag without it
    }
    const scrollable = area.scrollHeight - area.clientHeight
    const travel = geometry.height - INSET * 2 - geometry.thumbHeight
    drag.current = {startY: event.clientY, startScroll: area.scrollTop, ratio: travel > 0 ? scrollable / travel : 0}
    setDragging(true)
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    // Instant: Sanity's scroll area scrolls smoothly, which would trail the pointer
    area.scrollTo({top: drag.current.startScroll + (event.clientY - drag.current.startY) * drag.current.ratio, behavior: 'instant'})
  }
  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }

  return (
    <Track aria-hidden style={{top: geometry.top, right: geometry.right, height: geometry.height}}>
      <Thumb
        data-dragging={dragging ? '' : undefined}
        style={{top: geometry.thumbTop, height: geometry.thumbHeight}}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </Track>
  )
}

const Track = styled.div`
  position: absolute;
  z-index: 2;
  width: 12px;
  pointer-events: none;
`

const Thumb = styled.div`
  position: absolute;
  right: ${INSET}px;
  width: 6px;
  border-radius: 3px;
  background: rgb(255 255 255 / 0.22);
  pointer-events: auto;
  cursor: default;
  touch-action: none;
  transition:
    width 150ms ease,
    background-color 150ms ease;

  &:hover,
  &[data-dragging] {
    width: 8px;
    background: rgb(255 255 255 / 0.4);
  }
`
