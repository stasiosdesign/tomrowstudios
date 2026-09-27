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

   - Every document in Content: one header row, two grid rows tall, the
     document's large title (PaneTitle: a page's name, a CMS item's current
     title) beside its actions; no smaller label row, no title in the form
     (its Title field stays), so it is named once.
   - The page editor (a static page in Content), besides: no focus mode, no
     presence avatar, no Copy. The form fills the pane, its sections
     full-width rows like a collection's table.
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

  /* The header row on the Studio's grid (--tomrow-row-height, its hairline
     included, studio.css), so a document's rules meet those of the list
     beside it: one grid row in the Visual editor (its Edit switch and views),
     two where it holds the title (below) */
  ${HEADER_ROW} {
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

  /* Content: the header row is the title row, for a static page and a CMS
     item alike */
  &[data-tomrow-tool='structure'] {
    :has(> [data-testid='document-perspective-list']) {
      display: none;
    }

    /* Sanity's smaller label row repeats the title, so it goes; on a narrow
       screen it also holds the back arrow, the way back to the list, so there
       it stays with only its title hidden */
    [data-testid='pane-header']:not(:has(a[data-ui='Button'] [data-sanity-icon='arrow-left'])),
    [data-testid='pane-header'] [data-ui='Card']:has(> [data-ui='Flex'] > [data-ui='Text']) {
      display: none;
    }

    /* The title row is two grid rows tall: its rule meets the one under the
       second row of the list beside it (the sidebar, a collection's compact
       list), and a page's sections each meet a row of the sidebar */
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
      /* The last action (Show more; a CMS item's close) centred over the
         chevrons of a page's sections */
      padding-right: 2px;

      & > [data-ui='Flex'] {
        width: 100%;
      }
    }

    /* A CMS item's last action (close) in the same place as a page's (Show
       more): under the publishing button's edge */
    &:not([data-tomrow-page]) [data-ui='Box']:has(> [data-ui='Flex'] > [data-tomrow-pane-title]) {
      padding-right: 6px;
    }

    /* The form's own title: the header row names the document (the Title
       field that edits it stays in the form) */
    :has(> [data-testid='document-panel-document-title']) {
      display: none;
    }
  }

  /* The page editor, besides */
  &[data-tomrow-page][data-tomrow-tool='structure'] {
    [data-testid='document-level-presence'],
    [data-testid^='focus-pane-button'] {
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
