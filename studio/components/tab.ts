import {css} from 'styled-components'

/* Tabs and view choices: one look for everything that chooses what the
   Studio shows. The Visual editor's views use it as it is; the Content
   sidebar's entries and a collection's compact list as navigation entries
   (navItem, below); the top bar's Content / Visual editor switch
   (ToolToggle) keeps its chosen side white.
   A tab is chosen when it carries aria-current, aria-selected="true" or
   data-selected.

   - chosen: the grey highlight (--tomrow-selected), white text and icons
   - not chosen: no fill, dimmed grey text and icons (--tomrow-tab-fg)
   - under the pointer: a fainter wash and a lighter grey, never the chosen
     look
   - disabled: dimmer still, and no hover
   Text and icons take the tab's colour and change with it. Keyboard focus
   keeps its own ring, apart from all of these (each tab draws it). */
export const TAB_MOTION = '150ms ease'

export const tabStates = css`
  color: var(--tomrow-tab-fg);
  background-color: transparent;
  transition:
    color ${TAB_MOTION},
    background-color ${TAB_MOTION};

  /* Sanity paints text and icons with its own colours: here they take the
     tab's, and so change with it */
  --card-fg-color: currentColor;
  --card-muted-fg-color: currentColor;
  --card-icon-color: currentColor;

  & [data-ui='Text'] {
    color: inherit;
  }

  @media (hover: hover) {
    &:hover {
      color: var(--tomrow-tab-fg-hover);
      background-color: var(--tomrow-hover);
    }
  }

  &[aria-current]:not([aria-current='false']),
  &[aria-selected='true'],
  &[data-selected] {
    color: #ffffff;
    background-color: var(--tomrow-selected);
  }

  &:disabled,
  &[aria-disabled='true'],
  &[data-disabled='true'] {
    color: var(--tomrow-tab-fg-disabled);
    background-color: transparent;
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* Navigation entries, after Linear's docs: the Content sidebar's and a
   collection's compact list. Tabs (above) in shape: no rules between them,
   each a rounded row (--tomrow-nav-radius) inset from the column's edges
   and as tall as --tomrow-nav-row, its content on the Studio's 14px inset.
   An icon in a column of its own (data-nav-icon) when it has one, a step
   dimmer than the name until the entry is chosen; then the name
   (data-nav-label), 14px medium, one line. */
export const navItem = css`
  ${tabStates}
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  column-gap: 10px;
  align-items: center;
  box-sizing: border-box;
  min-height: var(--tomrow-nav-row);
  margin: 0 8px;
  padding: 0 6px;
  border-radius: var(--tomrow-nav-radius);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.25;
  text-decoration: none;
  cursor: pointer;

  & > [data-nav-icon] {
    display: flex;
    justify-content: center;
    font-size: 20px;
    line-height: 0;
    opacity: 0.6;
    transition: opacity ${TAB_MOTION};
  }

  @media (hover: hover) {
    &:hover > [data-nav-icon] {
      opacity: 0.8;
    }
  }

  &[aria-current]:not([aria-current='false']) > [data-nav-icon] {
    opacity: 1;
  }

  & > [data-nav-label] {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    & > [data-nav-icon] {
      transition: none;
    }
  }
`
