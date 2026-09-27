import {ChevronRightIcon} from '@sanity/icons/ChevronRight'
import {Box, Text} from '@sanity/ui'
import {createElement, useCallback, useEffect, useState, type ComponentType} from 'react'
import {useRouter} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {css, styled} from 'styled-components'

/* The Content sidebar: two accordion groups, each opened and closed on its
   own (and remembered in this browser), with the pages and the collections
   as links. The root pane of the structure (structure.ts), so each item
   opens as this pane's child. */

export type SidebarItem = {id: string; title: string; icon?: ComponentType}
export type SidebarGroup = {id: string; title: string; items: SidebarItem[]}
export type SidebarOptions = {groups: SidebarGroup[]}

const key = (id: string) => `tomrow.sidebar.${id}`

const readOpen = (id: string): boolean => {
  try {
    return window.localStorage.getItem(key(id)) !== 'closed'
  } catch {
    return true
  }
}

export function ContentSidebar(props: {options?: Record<string, unknown>; childItemId?: string}) {
  const {groups} = props.options as SidebarOptions
  const {ChildLink, groupIndex, routerPanesState} = usePaneRouter()
  const router = useRouter()

  // Nothing open beside the sidebar (entering Content, or coming back to it
  // with nothing chosen): open the first page, so the workspace is never an
  // empty panel
  const first = groups[0]?.items[0]
  const nothingOpen = !props.childItemId && !!first
  useEffect(() => {
    if (nothingOpen) router.navigate({panes: [...routerPanesState.slice(0, groupIndex + 1), [{id: first.id}]]}, {replace: true})
  }, [nothingOpen, first, router, routerPanesState, groupIndex])
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
      <div>
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
              <Text size={1} muted>
                <ChevronRightIcon style={{transform: open[group.id] ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s ease'}} />
              </Text>
              <GroupTitle>{group.title}</GroupTitle>
            </GroupButton>
            {open[group.id] && (
              <List id={`sidebar-${group.id}-items`} role="list">
                {group.items.map((item) => {
                  const selected = props.childItemId === item.id
                  return (
                    <li key={item.id}>
                      <ItemLink as={ChildLink} childId={item.id} $selected={selected} aria-current={selected ? 'page' : undefined}>
                        <Text size={1} muted={!selected}>
                          {item.icon && createElement(item.icon)}
                        </Text>
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
      </div>
    </Box>
  )
}

/* Ruled full-width rows like the page editor's sections and the collection
   tables: the same 43px height, 14px inset and hairline, the first ruled off
   by the pane's header above (studio.css). Two columns for every row: the
   chevrons and the icons in the first, the group names and the page and
   collection names in the second. */
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
  min-height: 43px;
  padding: 0 14px;
  border-bottom: 1px solid var(--card-border-color);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: -2px;
  }
`

const GroupButton = styled.button`
  all: unset;
  ${row}

  &:hover {
    background: var(--tomrow-hover);
  }
`

const GroupTitle = styled.span`
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.6);

  [data-holds-open] > & {
    color: #ffffff;
  }
`

const ItemLink = styled.a<{$selected: boolean}>`
  ${row}
  color: inherit;
  text-decoration: none;
  background: ${({$selected}) => ($selected ? 'var(--tomrow-selected)' : 'transparent')};

  &:hover {
    background: ${({$selected}) => ($selected ? 'var(--tomrow-selected)' : 'var(--tomrow-hover)')};
  }
`
