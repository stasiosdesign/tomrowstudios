import {Box, Card, Flex, Text} from '@sanity/ui'
import {createElement, type CSSProperties} from 'react'
import {StateLink} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {styled} from 'styled-components'
import type {SidebarGroup} from './ContentSidebar'
import {TAB_MOTION} from './tab'

/* The Content tool's home, laid out like the front page of Linear's docs:
   the sidebar's two groups, each a section of cards, one card per page or
   collection with its icon, its name and what it holds. Each group is
   headed by its icon in a square (the Page Editor's white, the CMS
   Collections' grey, so the two read apart at a glance), its name and a
   line saying what kind of content it holds, for someone who doesn't know
   the difference. A second way in: a card opens its page or collection in
   this pane's place, as the sidebar's entry does, and the sidebar then
   marks it. Content opens here (ContentSidebar). The list, with its names,
   icons and descriptions, comes from structure.ts, so the two always
   agree. */

export type HomeOptions = {title: string; groups: SidebarGroup[]}

export function ContentHome(props: {options?: Record<string, unknown>}) {
  const {title, groups} = props.options as HomeOptions
  const {groupIndex, routerPanesState} = usePaneRouter()
  // Beside the sidebar, in this pane's place
  const opening = (id: string) => ({panes: [...routerPanesState.slice(0, groupIndex), [{id}]]})

  return (
    <Flex direction="column" height="fill" data-tomrow-home>
      <Card borderBottom style={HEADER}>
        <Text size={1} weight="semibold">
          {title}
        </Text>
      </Card>
      <Box flex={1} overflow="auto">
        <Body>
          {groups.map((group, index) => (
            <Section key={group.id} aria-labelledby={`home-${group.id}`}>
              <SectionHead>
                <GroupIcon aria-hidden data-tone={index === 0 ? 'light' : 'dark'}>
                  {group.icon && createElement(group.icon)}
                </GroupIcon>
                <SectionHeading id={`home-${group.id}`}>{group.title}</SectionHeading>
              </SectionHead>
              {group.description && <SectionText>{group.description}</SectionText>}
              <Cards role="list">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Tile as={StateLink} state={opening(item.id)}>
                      <TileIcon aria-hidden>{item.icon && createElement(item.icon)}</TileIcon>
                      <TileText>
                        <TileTitle>{item.title}</TileTitle>
                        {item.description && <TileDescription>{item.description}</TileDescription>}
                      </TileText>
                    </Tile>
                  </li>
                ))}
              </Cards>
            </Section>
          ))}
        </Body>
      </Box>
    </Flex>
  )
}

/* The header band: one bar tall (--tomrow-bar-height) and ruled, like the
   sidebar's beside it, the pane's name set as the sidebar's "Content" is,
   so the two read as one bar */
const HEADER: CSSProperties = {
  flexShrink: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: 'var(--tomrow-bar-height)',
  padding: '10px 14px',
}

/* The page under it: one centred column, no wider than four cards abreast,
   with room around it, a section per group with air between them */
const Body = styled.div`
  box-sizing: border-box;
  max-width: 1040px;
  margin: 0 auto;
  padding: 48px 32px 80px;
`

const Section = styled.section`
  & + & {
    margin-top: 72px;
  }
`

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

/* The group's icon in a square the cards' corners: the Page Editor's white
   with a black icon, the CMS Collections' the fields' grey with a white one */
const GroupIcon = styled.span`
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--tomrow-card-radius);
  font-size: 21px;
  line-height: 0;

  &[data-tone='light'] {
    background: #ffffff;
    color: #000000;
  }

  &[data-tone='dark'] {
    background: var(--tomrow-field-pressed);
    color: #ffffff;
  }
`

const SectionHeading = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: #ffffff;
`

const SectionText = styled.p`
  max-width: 640px;
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--tomrow-tab-fg);
`

// role="list" stays on it: without list styling, Safari no longer announces a list
const Cards = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;

  & > li {
    display: flex;
  }
`

/* A card: a plain rectangle a shade lighter than the page, its edge a
   hairline, both a little brighter under the pointer, its corners the
   cards' (--tomrow-card-radius). The icon has the top of it to itself, the
   same height on every card, so the rule under it runs level across a row;
   the name and description take the rest. */
const Tile = styled.a`
  display: flex;
  flex: 1;
  flex-direction: column;
  box-sizing: border-box;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: var(--tomrow-card-radius);
  background-color: rgb(255 255 255 / 0.05);
  color: #ffffff;
  text-decoration: none;
  transition:
    background-color ${TAB_MOTION},
    border-color ${TAB_MOTION};

  @media (hover: hover) {
    &:hover {
      border-color: rgb(255 255 255 / 0.12);
      background-color: rgb(255 255 255 / 0.07);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

// The icon's drawing sits inside its box; drawn 4px out, its edge lines up
// with the name's
const TileIcon = styled.div`
  box-sizing: border-box;
  height: 136px;
  padding: 24px 20px;
  font-size: 24px;
  line-height: 0;

  & > svg {
    margin: -4px;
  }
`

const TileText = styled.div`
  flex: 1;
  padding: 20px;
  border-top: 1px solid rgb(255 255 255 / 0.06);
`

const TileTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
`

const TileDescription = styled.p`
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--tomrow-tab-fg);
`
