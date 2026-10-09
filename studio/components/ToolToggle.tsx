import {Flex, Text} from '@sanity/ui'
import type {CSSProperties, KeyboardEvent, MouseEvent} from 'react'
import {ToolLink, type Tool} from 'sanity'
import {useRouter} from 'sanity/router'
import {css, styled} from 'styled-components'

/* The top bar's switch between the Studio's tools, Content and the Visual
   editor, at its right (StudioNavbar): one grey track with the same small
   corners as every other control, the active tool white with black text on
   a highlight that slides over to the other when it becomes active (the
   Osmo toggle switch's motion), the other dimmed like any tab that isn't
   chosen (tab.ts: the same greys, lighter under the pointer).

   Each option is Sanity's own tool link, so switching, the address and each
   tool's state work as before. Which option is lit is Sanity's active tool,
   never a state of its own, so it always matches the view. The options are
   links: Tab reaches each, Enter follows it, the arrow keys (and Home and End)
   move between them as in Sanity's own tool menu, and the active one is
   marked aria-current.

   Where the bar knows a place in the other tool for what is open (the same
   page in the Visual editor, from the page editor, and back: pathFor), that
   option goes there instead of to the tool's start. */
export function ToolToggle({tools, activeToolName, pathFor}: {tools: Tool[]; activeToolName?: string; pathFor?: (toolName: string) => string | undefined}) {
  const router = useRouter()
  if (tools.length < 2) return null
  // A plain click stays in the Studio; a new tab or window gets the address
  const follow = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    router.navigateUrl({path})
  }
  const active = tools.findIndex((tool) => tool.name === activeToolName)
  const style = {'--tomrow-toggle-count': tools.length, '--tomrow-toggle-active': Math.max(active, 0)} as CSSProperties
  return (
    <Flex justify="center" style={{minWidth: 0}}>
      <Track aria-label="Studio tools" data-tomrow-tool-toggle onKeyDown={moveFocus} style={style}>
        <Pill aria-hidden data-hidden={active < 0 ? '' : undefined} />
        {tools.map((tool) => {
          const selected = tool.name === activeToolName
          const path = selected ? undefined : pathFor?.(tool.name)
          const label = (
            <Text size={1} weight="medium">
              {tool.title || tool.name}
            </Text>
          )
          return path ? (
            <PlaceOption key={tool.name} href={path} onClick={(event) => follow(event, path)}>
              {label}
            </PlaceOption>
          ) : (
            <Option key={tool.name} name={tool.name} aria-current={selected ? 'page' : undefined} data-selected={selected ? '' : undefined}>
              {label}
            </Option>
          )
        })}
      </Track>
    </Flex>
  )
}

// Arrow keys, Home and End move the focus between the options
function moveFocus(event: KeyboardEvent<HTMLElement>) {
  const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]'))
  const index = links.findIndex((link) => link === document.activeElement)
  if (index < 0) return
  const targets: Record<string, number> = {ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: links.length - 1}
  const target = targets[event.key]
  if (target === undefined) return
  event.preventDefault()
  links[(target + links.length) % links.length]?.focus()
}

/** The Osmo toggle's easing and pace, for the highlight and the labels alike */
const MOTION = '500ms cubic-bezier(0.65, 0.05, 0, 1)'
const INSET = 3

const Track = styled.nav`
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  padding: ${INSET}px;
  border-radius: var(--tomrow-radius);
  background: var(--tomrow-selected);
`

const Pill = styled.span`
  position: absolute;
  top: ${INSET}px;
  bottom: ${INSET}px;
  left: ${INSET}px;
  width: calc((100% - ${INSET * 2}px) / var(--tomrow-toggle-count));
  border-radius: 2px;
  background: #ffffff;
  transform: translateX(calc(100% * var(--tomrow-toggle-active)));
  transition: transform ${MOTION};

  &[data-hidden] {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const option = css`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 16px;
  border-radius: 2px;
  color: var(--tomrow-tab-fg);
  text-decoration: none;
  white-space: nowrap;
  transition: color ${MOTION};

  & [data-ui='Text'] {
    color: inherit;
  }

  &[data-selected] {
    color: #000000;
  }

  @media (hover: hover) {
    &:not([data-selected]):hover {
      color: var(--tomrow-tab-fg-hover);
      background: var(--tomrow-hover);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

// Sanity's own tool link, or a plain link to a place in the other tool (pathFor)
const Option = styled(ToolLink)`
  ${option}
`

const PlaceOption = styled.a`
  ${option}
`
