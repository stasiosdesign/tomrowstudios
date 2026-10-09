import {AddUserIcon} from '@sanity/icons/AddUser'
import {CheckmarkIcon} from '@sanity/icons/Checkmark'
import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {CogIcon} from '@sanity/icons/Cog'
import {LeaveIcon} from '@sanity/icons/Leave'
import {Card, Flex, Text} from '@sanity/ui'
import {Menu, MenuButton, MenuDivider, MenuItem} from '@sanity/ui/menu'
import type {ComponentProps, ComponentType, MouseEvent} from 'react'
import {ToolLink, useWorkspace} from 'sanity'
import {useRouter, useRouterState} from 'sanity/router'
import {css, styled} from 'styled-components'
import {useCms} from '../context'
import {SIDEBAR_WIDTH} from '../page'
import {cmsItemPath, pageEditorPath, placeOf, visualEditorPath} from './navigation'

/* The Studio's top bar (sanity.config.ts, studio.components.navbar): one
   row, like Linear's.

   - At the left, as wide as the Content sidebar under it and ruled off on
     the sidebar's own rule: the site's icon, a hairline and "CMS". It
     opens the project menu: Manage project and Invite members (on
     sanity.io, in a new tab, as in Sanity's own menu) and Sign out.
   - Then, on the panes' 14px inset, the two tools as two plain buttons,
     Content and Visual Editor: the open one white with black text, the
     other dimmed like any tab that isn't chosen (tab.ts: the same greys,
     lighter under the pointer). Each is Sanity's own tool link, so
     switching, the address and each tool's state work as before, and the
     open one is marked aria-current. Where the bar knows a place in the
     other tool for what is open (the same page in the Visual editor, from
     the page editor, and back: pathFor), the button goes there instead of
     to the tool's start.
   - In the Visual editor, the page in the preview is named in the middle
     of the room left: a menu of the page editor's pages, the one shown
     ticked, each opening the Visual editor on that page.

   It stands in for Sanity's own bar, whose other parts this Studio does
   without: search, New document, who is here, the user menu, help and
   releases. */
export function StudioNavbar() {
  const {auth, projectId, title, tools} = useWorkspace()
  const cms = useCms()
  // The site's icon (brand.icon)
  const StudioIcon = cms.brand.icon
  const activeToolName = useRouterState((state) => (typeof state.tool === 'string' ? state.tool : undefined))
  const manageUrl = `https://www.sanity.io/manage/project/${projectId}`
  const router = useRouter()

  // Where the Studio is (read again on every move): the page or CMS item open
  const address = new URL(useRouterState(() => window.location.href))
  const place = placeOf(cms, address.pathname, address.search)
  const pathFor = (toolName: string) => {
    if (toolName === 'presentation') return place.page && visualEditorPath(place.page)
    if (toolName === 'structure') return place.item ? cmsItemPath(place.item.type, place.item.id) : place.page && pageEditorPath(place.page)
    return undefined
  }
  // A plain click stays in the Studio; a new tab or window gets the address
  const follow = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    router.navigateUrl({path})
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
        <Rest>
          <Modes aria-label="Studio tools">
            {tools.map((tool) => {
              const selected = tool.name === activeToolName
              const path = selected ? undefined : pathFor(tool.name)
              const label = tool.title || tool.name
              return path ? (
                <PlaceMode key={tool.name} href={path} onClick={(event) => follow(event, path)}>
                  {label}
                </PlaceMode>
              ) : (
                <Mode key={tool.name} name={tool.name} aria-current={selected ? 'page' : undefined} data-selected={selected ? '' : undefined}>
                  {label}
                </Mode>
              )
            })}
          </Modes>
          {activeToolName === 'presentation' && (
            <Middle>
              <MenuButton
                id="tomrow-all-pages"
                button={
                  <PagesButton type="button" aria-label="Page shown in the preview">
                    <span>{place.page?.title ?? 'All pages'}</span>
                    <Icon icon={ChevronDownIcon} />
                  </PagesButton>
                }
                menu={
                  <Menu>
                    {cms.pageLinks.map((page) => {
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
                popover={{placement: 'bottom', portal: true}}
              />
            </Middle>
          )}
        </Rest>
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
`

/* The sidebar's width, with the sidebar's own rule: Sanity draws a pane's
   right edge as a 1px line just outside its box (box-shadow, not a border),
   so the rule here is drawn the same way, and the two meet the bar's rule
   below in one line. On a phone, as wide as it needs, and no rule. */
const Brand = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  align-self: stretch;
  box-sizing: border-box;
  width: ${SIDEBAR_WIDTH}px;
  padding: 0 10px;
  box-shadow: 1px 0 0 var(--card-border-color);

  @media (max-width: 599px) {
    width: auto;
    box-shadow: none;
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

// "CMS", and the page's name in the Visual editor: the bar's names, set alike
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

/* The rest of the bar, after the brand (the sidebar's rule is between): the
   tool buttons at its left, and in the middle of all of it, the page's name
   in the Visual editor, in a column of its own between two equal ones, so
   it is centred on this room whatever is beside it */
const Rest = styled.div`
  display: grid;
  flex: 1;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-width: 0;
  height: 100%;
  padding: 0 14px 0 15px;
`

const Modes = styled.nav`
  display: flex;
  gap: 4px;
  justify-self: start;
`

/* A tool's button: a plain rectangle, the controls' small corners, no motion.
   The open tool white with black text; the other the dimmed grey of a tab
   that isn't chosen, lighter and faintly washed under the pointer. */
const mode = css`
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: 28px;
  padding: 0 12px;
  border-radius: var(--tomrow-radius);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--tomrow-tab-fg);
  text-decoration: none;
  white-space: nowrap;

  @media (hover: hover) {
    &:not([data-selected]):hover {
      color: var(--tomrow-tab-fg-hover);
      background-color: var(--tomrow-hover);
    }
  }

  &[data-selected] {
    color: #000000;
    background-color: #ffffff;
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: 2px;
  }
`

// Sanity's own tool link, or a plain link to a place in the other tool (pathFor)
const Mode = styled(ToolLink)`
  ${mode}
`

const PlaceMode = styled.a`
  ${mode}
`

const Middle = styled.div`
  grid-column: 2;
  min-width: 0;

  @media (max-width: 599px) {
    display: none;
  }
`

// The page's name, white as the bar's names are, with a small chevron: a
// quiet control, faintly washed under the pointer and while its list is open
const PagesButtonRoot = styled.button`
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 4px 6px 4px 10px;
  border-radius: var(--tomrow-radius);
  color: #ffffff;
  cursor: pointer;

  & > span:first-child {
    ${name}
    overflow: hidden;
    text-overflow: ellipsis;
  }

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
`

const IconBox = styled.span`
  display: flex;
  font-size: 19px;
  line-height: 0;
  color: var(--tomrow-tab-fg);
`
