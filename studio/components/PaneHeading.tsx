import {styled} from 'styled-components'

/* The one large heading at the top of a pane: a static page's title in the
   page editor (PaneTitle) and a collection's name (CollectionPane). Same
   size, weight, line height and 14px inset as the rows beneath them. */
export const PaneHeading = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
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

/* The vertical room around a pane heading, shared by both header rows */
export const PANE_HEADING_PADDING_Y = 20
