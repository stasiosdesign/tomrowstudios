import {Box, Card, Flex} from '@sanity/ui'
import {createElement, type CSSProperties} from 'react'
import {StateLink} from 'sanity/router'
import {usePaneRouter} from 'sanity/structure'
import {styled} from 'styled-components'
import type {SidebarGroup} from './ContentSidebar'
import {PaneHeading} from './PaneHeading'
import {TAB_MOTION} from './tab'

/* The Content tool's home, laid out like the front page of Linear's docs:
   the sidebar's two groups again, each a section of cards, one card per page
   or collection with its icon, its name and what it holds. A second way in:
   a card opens its page or collection in this pane's place, as the sidebar's
   entry does, and the sidebar then marks it. Content opens here
   (ContentSidebar). The list, with its names, icons and descriptions, comes
   from structure.ts, so the two always agree. */

export type HomeOptions = {title: string; groups: SidebarGroup[]}

export function ContentHome(props: {options?: Record<string, unknown>}) {
  const {title, groups} = props.options as HomeOptions
  const {groupIndex, routerPanesState} = usePaneRouter()
  // Beside the sidebar, in this pane's place
  const opening = (id: string) => ({panes: [...routerPanesState.slice(0, groupIndex), [{id}]]})

  return (
    <Flex direction="column" height="fill" data-tomrow-home>
      <Card borderBottom style={HEADER}>
        <PaneHeading>{title}</PaneHeading>
      </Card>
      <Box flex={1} overflow="auto">
        <Body>
          <Intro>The website’s pages and the collections behind them. Choose one to start editing.</Intro>
          {groups.map((group) => (
            <Section key={group.id} aria-labelledby={`home-${group.id}`}>
              <SectionHeading id={`home-${group.id}`}>{group.title}</SectionHeading>
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

/* The header band, as a collection's: one bar tall (--tomrow-bar-height),
   ruled, the pane's name in the pane heading on the 14px inset */
const HEADER: CSSProperties = {
  flexShrink: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: 'var(--tomrow-bar-height)',
  padding: '10px 14px',
}

/* The page under it: on the 14px inset like every pane, with room around
   the sections, no wider than four cards abreast */
const Body = styled.div`
  box-sizing: border-box;
  max-width: 1148px;
  padding: 28px 14px 56px;
`

const Intro = styled.p`
  margin: 0 0 40px;
  max-width: 560px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--tomrow-tab-fg);
`

const Section = styled.section`
  & + & {
    margin-top: 48px;
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
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--tomrow-tab-fg);
`

// role="list" stays on it: without list styling, Safari no longer announces a list
const Cards = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;

  & > li {
    display: flex;
  }
`

/* A card: a plain rectangle a shade lighter than the page, its edge a
   hairline, both a little brighter under the pointer. The icon has the top
   of it to itself, the same height on every card, so the rule under it runs
   level across a row; the name and description take the rest. */
const Tile = styled.a`
  display: flex;
  flex: 1;
  flex-direction: column;
  box-sizing: border-box;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: var(--tomrow-radius);
  background-color: rgb(255 255 255 / 0.05);
  color: #ffffff;
  text-decoration: none;
  transition:
    background-color ${TAB_MOTION},
    border-color ${TAB_MOTION};

  @media (hover: hover) {
    &:hover {
      border-color: rgb(255 255 255 / 0.16);
      background-color: rgb(255 255 255 / 0.08);
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

const TileIcon = styled.div`
  box-sizing: border-box;
  height: 104px;
  padding: 20px;
  font-size: 25px;
  line-height: 0;
`

const TileText = styled.div`
  flex: 1;
  padding: 16px 20px 20px;
  border-top: 1px solid rgb(255 255 255 / 0.08);
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
