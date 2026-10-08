import {ChevronRightIcon} from '@sanity/icons/ChevronRight'
import {Box} from '@sanity/ui'
import {createElement, useCallback, useEffect, useState, type ComponentType} from 'react'
import {useRouter} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {styled} from 'styled-components'
import {navItem, TAB_MOTION} from './tab'

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
      <Nav aria-label="Content">
        <NavLink as={ChildLink} childId={overview.id} aria-current={props.childItemId === overview.id ? 'page' : undefined}>
          <Icon icon={overview.icon} />
          <span data-nav-label>{overview.title}</span>
        </NavLink>
        {groups.map((group) => (
          <Group key={group.id} aria-labelledby={`sidebar-${group.id}`}>
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
              <span data-nav-label>{group.title}</span>
              <Chevron data-open={open[group.id] ? '' : undefined}>
                <ChevronRightIcon />
              </Chevron>
            </GroupButton>
            {open[group.id] && (
              <List id={`sidebar-${group.id}-items`} role="list">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NestedLink as={ChildLink} childId={item.id} aria-current={props.childItemId === item.id ? 'page' : undefined}>
                      <Icon icon={item.icon} />
                      <span data-nav-label>{item.title}</span>
                    </NestedLink>
                  </li>
                ))}
              </List>
            )}
          </Group>
        ))}
      </Nav>
    </Box>
  )
}

const Icon = ({icon}: {icon?: ComponentType}) => <span data-nav-icon>{icon && createElement(icon)}</span>

/* A list of rounded entries with no rules between them (navItem, tab.ts):
   the overview, then each group under a little space of its own, its
   heading a little taller than its entries. As in Linear's docs, an
   entry's icon sits under its group's name, one step in. The overview and
   the entries are tabs: the open one white on the grey highlight, the
   others dimmed. */
const Nav = styled.nav`
  padding: 12px 0 24px;
`

const Group = styled.section`
  margin-top: 12px;
`

// role="list" stays on it: without list styling, Safari no longer announces a list
const List = styled.ul`
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 2px 0 0;
  list-style: none;
`

const NavLink = styled.a`
  ${navItem}
`

const NestedLink = styled.a`
  ${navItem}
  padding-left: 36px;
`

// A group's heading: dimmed while folded, white once open (or folded over
// what is open), its chevron a step quieter; lighter under the pointer
const GroupButton = styled.button`
  all: unset;
  ${navItem}
  grid-template-columns: 20px minmax(0, 1fr) 16px;
  width: calc(100% - 16px);
  min-height: var(--tomrow-nav-heading-row);

  &[aria-expanded='true'],
  &[data-holds-open] {
    color: #ffffff;

    & > [data-nav-icon] {
      opacity: 1;
    }
  }
`

const Chevron = styled.span`
  display: flex;
  justify-content: flex-end;
  font-size: 21px;
  line-height: 0;
  opacity: 0.6;

  & > svg {
    transition: transform ${TAB_MOTION};
  }

  &[data-open] > svg {
    transform: rotate(90deg);
  }

  @media (prefers-reduced-motion: reduce) {
    & > svg {
      transition: none;
    }
  }
`
