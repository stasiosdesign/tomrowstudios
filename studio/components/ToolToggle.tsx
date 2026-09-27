import {Flex, Text} from '@sanity/ui'
import type {CSSProperties, KeyboardEvent} from 'react'
import {ToolLink, type ToolMenuProps} from 'sanity'
import {styled} from 'styled-components'

/* The top bar's switch between the Studio's tools, Content and the Visual
   editor (sanity.config.ts, studio.components.toolMenu): one rounded grey
   track, the active tool on a white pill that slides over to the other when
   it becomes active (the Osmo toggle switch's motion).

   Each option is Sanity's own tool link, so switching, the address and each
   tool's state work as before. Which option is lit is Sanity's active tool,
   never a state of its own, so it always matches the view. The options are
   links: Tab reaches each, Enter follows it, the arrow keys (and Home and End)
   move between them as in Sanity's own tool menu, and the active one is
   marked aria-current. On a narrow screen the tools stay in Sanity's own
   side menu. */
export function ToolToggle(props: ToolMenuProps) {
  const {activeToolName, context, tools} = props
  if (context !== 'topbar' || tools.length < 2) return props.renderDefault(props)
  const active = tools.findIndex((tool) => tool.name === activeToolName)
  const style = {'--tomrow-toggle-count': tools.length, '--tomrow-toggle-active': Math.max(active, 0)} as CSSProperties
  return (
    <Flex justify="center" style={{minWidth: 0}}>
      <Track aria-label="Studio tools" data-tomrow-tool-toggle onKeyDown={moveFocus} style={style}>
        <Pill aria-hidden data-hidden={active < 0 ? '' : undefined} />
        {tools.map((tool) => {
          const selected = tool.name === activeToolName
          return (
            <Option key={tool.name} name={tool.name} aria-current={selected ? 'page' : undefined} data-selected={selected ? '' : undefined}>
              <Text size={1} weight="medium">
                {tool.title || tool.name}
              </Text>
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

/** The Osmo toggle's easing and pace, for the pill and the labels alike */
const MOTION = '500ms cubic-bezier(0.65, 0.05, 0, 1)'
const INSET = 3

const Track = styled.nav`
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  padding: ${INSET}px;
  border-radius: 999px;
  background: var(--tomrow-selected);
`

const Pill = styled.span`
  position: absolute;
  top: ${INSET}px;
  bottom: ${INSET}px;
  left: ${INSET}px;
  width: calc((100% - ${INSET * 2}px) / var(--tomrow-toggle-count));
  border-radius: 999px;
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

const Option = styled(ToolLink)`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 16px;
  border-radius: 999px;
  color: #ffffff;
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
