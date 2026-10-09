import {styled} from 'styled-components'

/* The one large heading at the top of a pane: a static page's title in the
   page editor (PaneTitle) and a collection's name (CollectionPane). Same
   size, weight, line height and 14px inset everywhere; semibold and tightly
   set, like the overview's headings (ContentHome) and Linear's. */
export const PaneHeading = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--card-fg-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* The count after a collection's name: quieter, the same line */
  & > .pane-heading__count {
    color: var(--card-muted-fg-color);
    font-weight: 400;
  }
`

/* The least room above and below the page editor's title (PaneTitle); its
   row is two grid rows tall (DocumentLayout), the title centred in it */
export const PANE_HEADING_PADDING_Y = 20
