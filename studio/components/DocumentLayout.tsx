import {Flex} from '@sanity/ui'
import {useRef} from 'react'
import type {DocumentLayoutProps} from 'sanity'
import {styled} from 'styled-components'
import {isPageType} from '../lib/site'
import {FORM_WIDTH} from './FieldLayout'
import {OverlayScrollbar} from './OverlayScrollbar'
import {useInVisualEditor} from './PreviewControls'
import {PublishControls} from './PublishControls'

/* Around every document pane, in Content and in the Visual editor: the
   publishing control across the top, then Sanity's own header and form
   (sanity.config.ts, document.components.unstable_layout). Sanity's footer,
   which held its Publish button, is empty now that the document actions are
   gone, so it is hidden.

   The pane is marked with the tool it is in and, for a static page, as a
   page, so the rules below can shape the header row for each:

   - CMS items in Content keep Sanity's header as it is (less Favorites).
   - The page editor (a static page in Content): one row, the page's large
     title (PaneTitle) opposite Show more; no smaller label row, no title in
     the form, no focus mode, no presence avatar, no Copy. The form fills the
     pane, its sections full-width rows like a collection's table.
   - The Visual editor: the header row holds the preview's Edit switch and
     phone view (PreviewControls) and Show more; the smaller
     label row goes, so the form's title names the document once.

   Everything is matched by Sanity's test IDs, its icons' names or this
   Studio's own markers, never by text.

   The form's scroll area keeps its full width whether or not it can scroll:
   its scrollbar is drawn over the edge (OverlayScrollbar), so opening a
   section that makes the form taller moves nothing sideways. */
export function DocumentLayout(props: DocumentLayoutProps) {
  // A document opens in Content (the structure tool) or the Visual editor (presentation)
  const tool = useInVisualEditor() ? 'presentation' : 'structure'
  const rootRef = useRef<HTMLDivElement | null>(null)
  return (
    <Root
      ref={rootRef}
      direction="column"
      height="fill"
      data-tomrow-document
      data-tomrow-tool={tool}
      data-tomrow-page={isPageType(props.documentType) ? '' : undefined}
    >
      <PublishControls documentId={props.documentId} documentType={props.documentType} />
      <Flex direction="column" flex={1} style={{minHeight: 0}}>
        {props.renderDefault(props)}
      </Flex>
      <OverlayScrollbar containerRef={rootRef} selector="[data-testid='document-panel-scroller']" />
    </Root>
  )
}

/** A document's header row, with its actions: found by the perspective chips it also holds (hidden) */
const HEADER_ROW = `[data-ui='Card']:has(> [data-ui='Flex'] > [data-ui='Card'] > [data-testid='document-perspective-list'])`

/* This element sits directly in Sanity's row of panes, beside the sidebar:
   it takes all the width left, or the editor stays as narrow as its content,
   and the row's full height (stretched, not 100%: on a phone the row's height
   is not fixed, and 100% would leave the document pane 0px tall) */
const Root = styled(Flex)`
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  /* Nothing inside may spill past the pane: Sanity's row of panes scrolls,
     and a fraction of a pixel too tall (the header's fractional heights, the
     scrollbar's track) gave it a scrollbar that shifted the whole interface
     left whenever a section opened. clip, not hidden: no new scroll area. */
  overflow: clip;
  height: auto;
  align-self: stretch;

  & [data-testid='pane-footer'] {
    display: none;
  }

  /* A static page's and the Visual editor's panes have no close button (the
     link-button with a close icon after Show more); CMS items in Content keep it */
  &:is([data-tomrow-page], [data-tomrow-tool='presentation']) :has([data-testid='pane-context-menu-button']) ~ :has(> a[data-ui='Button'] [data-sanity-icon='close']) {
    display: none;
  }

  /* A static page's form fills its pane, edge to edge like a collection's
     table (CollectionPane), instead of Sanity's centred 640px reading column:
     its sections are the rows (PageInput, SectionField). */
  &[data-tomrow-page] [data-testid='document-panel-scroller'] > div {
    max-width: none;
    margin: 0;
    padding: 8px 0 160px;
  }

  /* A CMS item's form, likewise, leaves the centred 640px column: it starts
     on the pane's 14px inset, under the status and the title, and takes the
     pane's width up to FORM_WIDTH, where lines would grow too long to read
     (the small fields share rows there: FieldLayout, studio.css) */
  &:not([data-tomrow-page]) [data-testid='document-panel-scroller'] > div {
    max-width: ${FORM_WIDTH + 28}px;
    margin: 0;
    padding-left: 14px;
    padding-right: 14px;
  }

  &[data-tomrow-page] [data-testid='copy-document-actions-button'] {
    display: none;
  }

  /* The header rows on the Studio's grid (--tomrow-row-height, its hairline
     included, studio.css), so a document's rules meet those of the list
     beside it: the row with the document's actions (the Visual editor's Edit
     switch and views there), and a CMS item's row with its name, one grid
     row each. The page editor's title row is two (below). */
  ${HEADER_ROW},
  &:not([data-tomrow-page]) [data-testid='pane-header'] > [data-ui='Card'] {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: var(--tomrow-row-height);

    & > [data-ui='Flex'] {
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  /* The page editor: the header row is the title row */
  &[data-tomrow-page][data-tomrow-tool='structure'] {
    [data-testid='pane-header'],
    [data-testid='document-level-presence'],
    [data-testid^='focus-pane-button'],
    :has(> [data-testid='document-perspective-list']) {
      display: none;
    }

    /* The title row is two grid rows tall: its rule meets the one under the
       sidebar's second row, and every section below meets a sidebar row */
    ${HEADER_ROW} {
      min-height: calc(var(--tomrow-row-height) * 2);
    }

    [data-ui='Flex']:has(> [data-ui='Box'] > [data-ui='Flex'] > [data-tomrow-pane-title]) {
      padding-block: 0;
    }

    [data-ui='Box']:has(> [data-ui='Flex'] > [data-tomrow-pane-title]) {
      flex: 1 1 auto;
      min-width: 0;
      padding-left: 14px;
      /* Show more's dots centred over the sections' chevrons */
      padding-right: 2px;

      & > [data-ui='Flex'] {
        width: 100%;
      }
    }

    /* The form's own title: the header row names the page */
    :has(> [data-testid='document-panel-document-title']) {
      display: none;
    }

    /* The first section meets the title row at the row's own divider: no
       room above the list, and no second rule on the first section */
    [data-testid='document-panel-scroller'] > div {
      padding-top: 0;
    }

    [data-tomrow-section]:first-child {
      border-top: 0;
    }

    /* Sanity keeps a 1px marker above the form (it watches the scroll); the
       form covers it, so the sections start on the grid */
    [data-testid='form-view'] {
      margin-top: -1px;
    }
  }

  /* Everywhere else a static page's form title keeps the rows' 14px inset */
  &[data-tomrow-page] [data-testid='document-panel-document-title'] {
    padding-inline: 14px;
  }

  /* The Visual editor: no smaller label row (with its Favorites star) */
  &[data-tomrow-tool='presentation'] [data-testid='pane-header'] {
    display: none;
  }
`
