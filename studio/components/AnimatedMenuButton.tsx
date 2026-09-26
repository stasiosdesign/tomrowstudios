import {usePrefersReducedMotion} from '@sanity/ui'
import {Popover, type PopoverProps} from '@sanity/ui/popover'
import {cloneElement, useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactElement} from 'react'

/* Dropdowns that open and close smoothly (studio.css, tomrow-pop-in and
   tomrow-pop-out): a popover stays mounted a moment after it is closed, marked
   data-tomrow-pop-closing, while it fades out.

   - useAnimatedOpen: the open / closing / closed cycle, for any popover whose
     open state is this Studio's own (the Columns chooser).
   - AnimatedMenuButton: Sanity UI's MenuButton, the same keyboard and focus
     behaviour (Arrow keys and Enter open it, Escape and a click outside or
     on an item close it, focus returns to the button), built on its Menu with
     that cycle, since MenuButton closes instantly (the publishing menu).

   Instant for anyone who prefers reduced motion. */

/** How long a closing dropdown takes to fade (tomrow-pop-out in studio.css) */
export const EXIT_MS = 200

export function useAnimatedOpen() {
  const reduceMotion = usePrefersReducedMotion()
  const [state, setState] = useState<'closed' | 'open' | 'closing'>('closed')
  const show = useCallback(() => setState('open'), [])
  const hide = useCallback(() => setState((current) => (current === 'open' ? (reduceMotion ? 'closed' : 'closing') : current)), [reduceMotion])
  useEffect(() => {
    if (state !== 'closing') return undefined
    const timer = setTimeout(() => setState('closed'), EXIT_MS)
    return () => clearTimeout(timer)
  }, [state])
  return {mounted: state !== 'closed', isOpen: state === 'open', closing: state === 'closing', show, hide}
}

type MenuElementProps = {
  'aria-labelledby'?: string
  'onBlurCapture'?: (event: FocusEvent) => void
  'onClickOutside'?: (event: globalThis.MouseEvent) => void
  'onEscape'?: () => void
  'onItemClick'?: () => void
  'originElement'?: HTMLElement | null
  'registerElement'?: (el: HTMLElement) => () => void
  'shouldFocus'?: 'first' | 'last' | null
  'data-tomrow-pop'?: string
  'data-tomrow-pop-closing'?: string
}

export function AnimatedMenuButton({
  id,
  button,
  menu,
  popover,
}: {
  id: string
  button: ReactElement<{selected?: boolean}>
  menu: ReactElement<MenuElementProps>
  popover?: Omit<PopoverProps, 'content' | 'open' | 'children'>
}) {
  const {mounted, isOpen, closing, show, hide} = useAnimatedOpen()
  const [shouldFocus, setShouldFocus] = useState<'first' | 'last' | null>(null)
  const [buttonElement, setButtonElement] = useState<HTMLElement | null>(null)
  // Read by the handlers below through refs, so the handlers stay the same
  // functions from render to render: Menu registers and listens with them,
  // and new ones each render would have it re-register without end
  const openRef = useRef(isOpen)
  openRef.current = isOpen
  const buttonRef = useRef<HTMLElement | null>(null)
  buttonRef.current = buttonElement
  const menuElements = useRef<HTMLElement[]>([])

  const open = useCallback(
    (focus: 'first' | 'last' | null) => {
      setShouldFocus(focus)
      show()
    },
    [show],
  )
  const close = useCallback(
    (restoreFocus: boolean) => {
      if (!openRef.current) return
      hide()
      if (restoreFocus) buttonRef.current?.focus()
    },
    [hide],
  )
  const inMenu = useCallback((target: Node) => menuElements.current.some((el) => el === target || el.contains(target)), [])

  const onBlurCapture = useCallback(
    (event: FocusEvent) => {
      const target = event.relatedTarget
      if (target instanceof Node && !inMenu(target)) close(false)
    },
    [close, inMenu],
  )
  const onClickOutside = useCallback(
    (event: globalThis.MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      const button = buttonRef.current
      if (button && (target === button || button.contains(target))) return
      if (!inMenu(target)) close(false)
    },
    [close, inMenu],
  )
  const closeAndFocus = useCallback(() => close(true), [close])
  const registerElement = useCallback((el: HTMLElement) => {
    menuElements.current = menuElements.current.concat([el])
    return () => {
      menuElements.current = menuElements.current.filter((item) => item !== el)
    }
  }, [])

  const menuNode = cloneElement(menu, {
    'aria-labelledby': id,
    'onBlurCapture': onBlurCapture,
    'onClickOutside': onClickOutside,
    'onEscape': closeAndFocus,
    'onItemClick': closeAndFocus,
    'originElement': buttonElement,
    'registerElement': registerElement,
    'shouldFocus': shouldFocus,
    'data-tomrow-pop': '',
    'data-tomrow-pop-closing': closing ? '' : undefined,
  })

  const buttonNode = cloneElement(button, {
    'data-ui': 'MenuButton',
    id,
    'onClick': () => (isOpen ? close(false) : open(null)),
    'onKeyDown': (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open('first')
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        open('last')
      }
    },
    'onMouseDown': (event: MouseEvent) => {
      if (isOpen) event.preventDefault()
    },
    'aria-haspopup': true,
    'aria-expanded': isOpen,
    'ref': setButtonElement,
    'selected': button.props.selected ?? isOpen,
  } as Record<string, unknown>)

  return (
    <Popover data-ui="MenuButton__popover" overflow="auto" portal {...popover} content={menuNode} open={mounted}>
      {buttonNode}
    </Popover>
  )
}
