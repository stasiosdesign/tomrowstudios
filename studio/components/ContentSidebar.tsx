import {ChevronRightIcon} from '@sanity/icons/ChevronRight'
import {Box, Text} from '@sanity/ui'
import {createElement, useCallback, useEffect, useState, type ComponentType} from 'react'
import {useRouter} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {css, styled} from 'styled-components'
import {TAB_MOTION, tabStates} from './tab'

/* The Content sidebar, laid out like Linear's docs: the overview on top,
   then two groups, Page Editor and CMS Collections, each folded and unfolded
   on its own (and remembered in this browser), its pages or collections
   nested under it. Every entry has its icon. The overview (ContentHome)
   shows the same list again as cards; both read it from structure.ts. The
   root pane of the structure, so each entry opens as this pane's child. */

export type SidebarItem = {id: string; title: string; icon?: ComponentType; description?: string}
export type SidebarGroup = SidebarItem & {items: SidebarItem[]}
export type SidebarOptions = {overview: SidebarItem; groups: SidebarGroup[]}

const key = (id: string) => `tomrow.sidebar.${id}`

const readOpen = (id: string): boolean => {
  try {
    return window.localStorage.getItem(key(id)) !== 'closed'
  } catch {
    return true
  }
}

export function ContentSidebar(props: {options?: Record<string, unknown>; childItemId?: string}) {
  const {overview, groups} = props.options as SidebarOptions
  const {ChildLink, groupIndex, routerPanesState} = usePaneRouter()
  const router = useRouter()

  // Nothing open beside the sidebar (entering Content, or coming back to it
  // with nothing chosen): open the overview, so the workspace is never an
  // empty panel
  const nothingOpen = !props.childItemId
  useEffect(() => {
    if (nothingOpen) router.navigate({panes: [...routerPanesState.slice(0, groupIndex + 1), [{id: overview.id}]]}, {replace: true})
  }, [nothingOpen, overview.id, router, routerPanesState, groupIndex])
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map((group) => [group.id, readOpen(group.id)])))
  const toggle = useCallback((id: string) => {
    setOpen((current) => {
      const next = {...current, [id]: !current[id]}
      try {
        window.localStorage.setItem(key(id), next[id] ? 'open' : 'closed')
      } catch {
        // not remembered, that's all
      }
      return next
    })
  }, [])

  return (
    <Box overflow="auto" height="fill" data-tomrow-sidebar>
      <nav aria-label="Content">
        <TopLink as={ChildLink} childId={overview.id} aria-current={props.childItemId === overview.id ? 'page' : undefined}>
          <Icon icon={overview.icon} />
          <Label>{overview.title}</Label>
        </TopLink>
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`sidebar-${group.id}`}>
            <GroupButton
              type="button"
              id={`sidebar-${group.id}`}
              aria-expanded={open[group.id]}
              aria-controls={`sidebar-${group.id}-items`}
              // A folded group that holds what is open says so: its name brightens
              data-holds-open={!open[group.id] && group.items.some((item) => item.id === props.childItemId) ? '' : undefined}
              onClick={() => toggle(group.id)}
            >
              <Icon icon={group.icon} />
              <Label>{group.title}</Label>
              <Text size={1}>
                <ChevronRightIcon style={{transform: open[group.id] ? 'rotate(90deg)' : undefined, transition: `transform ${TAB_MOTION}`}} />
              </Text>
            </GroupButton>
            {open[group.id] && (
              <List id={`sidebar-${group.id}-items`} role="list">
                {group.items.map((item) => {
                  const selected = props.childItemId === item.id
                  return (
                    <li key={item.id}>
                      <ItemLink as={ChildLink} childId={item.id} aria-current={selected ? 'page' : undefined}>
                        <Icon icon={item.icon} />
                        <Text size={1} weight={selected ? 'medium' : 'regular'} textOverflow="ellipsis">
                          {item.title}
                        </Text>
                      </ItemLink>
                    </li>
                  )
                })}
              </List>
            )}
          </section>
        ))}
      </nav>
    </Box>
  )
}

const Icon = ({icon}: {icon?: ComponentType}) => <Text size={1}>{icon && createElement(icon)}</Text>

/* Ruled full-width rows on the Studio's grid (--tomrow-row-height, its
   hairline included, studio.css), like the page editor's sections and the
   collection tables beside them, so their rules meet: the first ruled off
   by the pane's header, as tall as the publishing bar. Every row starts with
   its icon, then its name; a group's row ends in its fold chevron, and its
   entries are nested one step in, their icons under its name. The overview
   and the entries are tabs (tab.ts): the open one white on the grey
   highlight, the others dimmed. */
// role="list" stays on it: without list styling, Safari no longer announces a list
const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`

const row = css`
  display: grid;
  grid-template-columns: 21px minmax(0, 1fr);
  column-gap: 10px;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--tomrow-row-height);
  padding: 0 14px;
  border-bottom: 1px solid var(--card-border-color);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: -2px;
  }
`

/* The top level, the overview and the groups' names: the Studio's display
   type (the pane headings' Inter Tight, tightly set) at the rows' size, a
   step heavier than the entries nested under them */
const Label = styled.span`
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const TopLink = styled.a`
  ${row}
  ${tabStates}
  text-decoration: none;
`

// Dimmed like a tab that isn't chosen, lighter under the pointer, white when
// folded over what is open; its icon and chevron take its colour
const GroupButton = styled.button`
  all: unset;
  ${row}
  grid-template-columns: 21px minmax(0, 1fr) 21px;
  color: var(--tomrow-tab-fg);
  transition:
    color ${TAB_MOTION},
    background-color ${TAB_MOTION};
  --card-fg-color: currentColor;
  --card-muted-fg-color: currentColor;
  --card-icon-color: currentColor;

  & [data-ui='Text'] {
    color: inherit;
  }

  &:hover {
    color: var(--tomrow-tab-fg-hover);
    background-color: var(--tomrow-hover);
  }

  &[data-holds-open] {
    color: #ffffff;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const ItemLink = styled.a`
  ${row}
  ${tabStates}
  padding-left: 45px;
  text-decoration: none;
`
