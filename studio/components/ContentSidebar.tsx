import {ChevronRightIcon} from '@sanity/icons/ChevronRight'
import {Box, Flex, Stack, Text} from '@sanity/ui'
import {createElement, useCallback, useEffect, useState, type ComponentType} from 'react'
import {useRouter} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {styled} from 'styled-components'

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
    <Box padding={2} overflow="auto" height="fill" data-tomrow-sidebar>
      <Stack gap={2}>
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`sidebar-${group.id}`}>
            <GroupButton type="button" id={`sidebar-${group.id}`} aria-expanded={open[group.id]} aria-controls={`sidebar-${group.id}-items`} onClick={() => toggle(group.id)}>
              <Flex align="center" gap={2}>
                <Text size={1} muted>
                  <ChevronRightIcon style={{transform: open[group.id] ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s ease'}} />
                </Text>
                <GroupTitle>{group.title}</GroupTitle>
              </Flex>
            </GroupButton>
            {open[group.id] && (
              <Stack as="ul" id={`sidebar-${group.id}-items`} role="list" gap={1} style={{listStyle: 'none', margin: 0, padding: '2px 0 4px'}}>
                {group.items.map((item) => {
                  const selected = props.childItemId === item.id
                  return (
                    <li key={item.id}>
                      <ItemLink as={ChildLink} childId={item.id} $selected={selected} aria-current={selected ? 'page' : undefined}>
                        <Flex align="center" gap={3}>
                          {item.icon && (
                            <Text size={1} muted={!selected}>
                              {createElement(item.icon)}
                            </Text>
                          )}
                          <Text size={1} weight={selected ? 'medium' : 'regular'} textOverflow="ellipsis">
                            {item.title}
                          </Text>
                        </Flex>
                      </ItemLink>
                    </li>
                  )
                })}
              </Stack>
            )}
          </section>
        ))}
      </Stack>
    </Box>
  )
}

const GroupButton = styled.button`
  all: unset;
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 8px 6px;
  cursor: pointer;
  border-radius: 3px;

  &:hover {
    background: var(--tomrow-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: -2px;
  }
`

const GroupTitle = styled.span`
  font-family: 'chivo-mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 300;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.6);
`

const ItemLink = styled.a<{$selected: boolean}>`
  display: block;
  padding: 8px 10px 8px 26px;
  border-radius: 3px;
  color: inherit;
  text-decoration: none;
  background: ${({$selected}) => ($selected ? 'var(--tomrow-selected)' : 'transparent')};
  box-shadow: ${({$selected}) => ($selected ? 'inset 2px 0 0 #dd341d' : 'none')};

  &:hover {
    background: ${({$selected}) => ($selected ? 'var(--tomrow-selected)' : 'var(--tomrow-hover)')};
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: -2px;
  }
`
