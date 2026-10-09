import {AddUserIcon} from '@sanity/icons/AddUser'
import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {CogIcon} from '@sanity/icons/Cog'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {LeaveIcon} from '@sanity/icons/Leave'
import {Card, Flex, Text} from '@sanity/ui'
import {Menu, MenuButton, MenuDivider, MenuItem} from '@sanity/ui/menu'
import type {ComponentProps, ComponentType} from 'react'
import {useWorkspace} from 'sanity'
import {useRouter, useRouterState} from 'sanity/router'
import {styled} from 'styled-components'
import {SIDEBAR_WIDTH} from '../page'
import {PAGE_LINKS} from '../structure'
import {cmsItemPath, pageEditorPath, placeOf, visualEditorPath} from './navigation'
import {StudioIcon} from './StudioIcon'
import {TAB_MOTION} from './tab'
import {ToolToggle} from './ToolToggle'

/* The Studio's top bar (sanity.config.ts, studio.components.navbar): one
   row, like Linear's.

   - At the left, as wide as the Content sidebar under it and ruled off at
     its edge: the website's favicon, a hairline and "CMS". It opens the
     project menu: Manage project and Invite members (on sanity.io, in a new
     tab, as in Sanity's own menu) and Sign out.
   - Then the open tool's name, on the panes' 14px inset; in the Visual
     editor, All pages beside it: the page editor's pages, the one in the
     preview ticked, each opening the Visual editor on that page.
   - At the right, the switch between Content and the Visual editor
     (ToolToggle), which takes what is open across: a page in the page
     editor opens the Visual editor on that page, and the Visual editor's
     page (or CMS item) opens in Content.

   It stands in for Sanity's own bar, whose other parts this Studio does
   without: search, New document, who is here, the user menu, help and
   releases. */
export function StudioNavbar() {
  const {auth, projectId, title, tools} = useWorkspace()
  const activeToolName = useRouterState((state) => (typeof state.tool === 'string' ? state.tool : undefined))
  const activeTool = tools.find((tool) => tool.name === activeToolName)
  const manageUrl = `https://www.sanity.io/manage/project/${projectId}`
  const router = useRouter()

  // Where the Studio is (read again on every move): the page or CMS item open
  const address = new URL(useRouterState(() => window.location.href))
  const place = placeOf(address.pathname, address.search)
  const pathFor = (toolName: string) => {
    if (toolName === 'presentation') return place.page && visualEditorPath(place.page)
    if (toolName === 'structure') return place.item ? cmsItemPath(place.item.type, place.item.id) : place.page && pageEditorPath(place.page)
    return undefined
  }

  return (
    <Card as="header" borderBottom data-tomrow-navbar>
      <Bar>
        <Brand>
          <MenuButton
            id="tomrow-project-menu"
            button={
              <ProjectButton type="button" aria-label={`${title}: project menu`}>
                <Logo>
                  <StudioIcon />
                </Logo>
                <Label>CMS</Label>
              </ProjectButton>
            }
            menu={
              <Menu>
                <Flex align="center" gap={3} padding={3}>
                  <MenuLogo>
                    <StudioIcon />
                  </MenuLogo>
                  <Text size={1} weight="semibold">
                    {title}
                  </Text>
                </Flex>
                <MenuDivider />
                <MenuItem as="a" href={manageUrl} target="_blank" rel="noreferrer" icon={CogIcon} text="Manage project" />
                <MenuItem as="a" href={`${manageUrl}/members?invite=true`} target="_blank" rel="noreferrer" icon={AddUserIcon} text="Invite members" />
                {auth.logout && (
                  <>
                    <MenuDivider />
                    <MenuItem icon={LeaveIcon} text="Sign out" onClick={() => void auth.logout?.()} />
                  </>
                )}
              </Menu>
            }
            popover={{placement: 'bottom-start', portal: true}}
          />
        </Brand>
        {activeTool && <Title>{activeTool.title}</Title>}
        {activeToolName === 'presentation' && (
          <MenuButton
            id="tomrow-all-pages"
            button={
              <PagesButton type="button">
                <Icon icon={DocumentsIcon} />
                <span>All pages</span>
                <Icon icon={ChevronDownIcon} />
              </PagesButton>
            }
            menu={
              <Menu>
                {PAGE_LINKS.map((page) => {
                  const current = place.page?.type === page.type
                  return (
                    <MenuItem
                      key={page.type}
                      icon={page.icon}
                      iconRight={current ? CheckmarkIcon : undefined}
                      selected={current}
                      text={page.title}
                      onClick={() => router.navigateUrl({path: visualEditorPath(page)})}
                    />
                  )
                })}
              </Menu>
            }
            popover={{placement: 'bottom-start', portal: true}}
          />
        )}
        <Tools>
          <ToolToggle tools={tools} activeToolName={activeToolName} pathFor={pathFor} />
        </Tools>
      </Bar>
    </Card>
  )
}

// Sanity UI's menu button marks its button `selected` while the menu is
// open, a prop for its own buttons that a plain one must not pass on
type TriggerProps = ComponentProps<'button'> & {selected?: boolean}
function ProjectButton({selected: _selected, ...props}: TriggerProps) {
  return <ProjectButtonRoot {...props} />
}
function PagesButton({selected: _selected, ...props}: TriggerProps) {
  return <PagesButtonRoot {...props} />
}

const Icon = ({icon: Glyph}: {icon: ComponentType}) => (
  <IconBox aria-hidden>
    <Glyph />
  </IconBox>
)

// As tall as Sanity's bar was (64px, and its hairline)
const Bar = styled.div`
  display: flex;
  align-items: center;
  height: 64px;
  padding-right: 14px;
`

// The sidebar's width, its rule the sidebar's edge; on a phone, as wide as it needs
const Brand = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  align-self: stretch;
  box-sizing: border-box;
  width: ${SIDEBAR_WIDTH}px;
  padding: 0 10px;
  border-right: 1px solid var(--card-border-color);

  @media (max-width: 599px) {
    width: auto;
    border-right: 0;
  }
`

// The favicon on the 14px inset, the name after a hairline; a faint wash under
// the pointer and while the menu is open
const ProjectButtonRoot = styled.button`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px 4px 4px;
  border-radius: var(--tomrow-nav-radius);
  color: #ffffff;
  cursor: pointer;
  transition: background-color ${TAB_MOTION};

  @media (hover: hover) {
    &:hover {
      background-color: var(--tomrow-hover);
    }
  }

  &[aria-expanded='true'] {
    background-color: var(--tomrow-selected);
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Logo = styled.span`
  display: block;
  flex: none;
  width: 24px;
  height: 24px;
`

const MenuLogo = styled(Logo)`
  width: 32px;
  height: 32px;
`

// "CMS", and the open tool's name: the bar's two names, set alike
const name = `
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  letter-spacing: -0.01em;
  white-space: nowrap;
`

const Label = styled.span`
  ${name}
  padding-left: 12px;
  border-left: 1px solid rgb(255 255 255 / 0.2);
`

const Title = styled.span`
  ${name}
  padding-left: 14px;
  color: #ffffff;

  @media (max-width: 599px) {
    display: none;
  }
`

// All pages: a quiet control beside the tool's name, the tabs' grey (tab.ts),
// lighter under the pointer, a faint wash while its list is open
const PagesButtonRoot = styled.button`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 10px;
  padding: 5px 8px;
  border-radius: var(--tomrow-radius);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: var(--tomrow-tab-fg);
  cursor: pointer;
  transition:
    color ${TAB_MOTION},
    background-color ${TAB_MOTION};

  @media (hover: hover) {
    &:hover {
      color: var(--tomrow-tab-fg-hover);
      background-color: var(--tomrow-hover);
    }
  }

  &[aria-expanded='true'] {
    color: #ffffff;
    background-color: var(--tomrow-selected);
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const IconBox = styled.span`
  display: flex;
  font-size: 19px;
  line-height: 0;
`

const Tools = styled.div`
  margin-left: auto;
`
