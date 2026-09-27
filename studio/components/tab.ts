import {css} from 'styled-components'

/* Tabs and view choices: one look for everything that chooses what the
   Studio shows. A collection's compact list and the Visual editor's views
   use it as it is; the Content sidebar's pages and collections without the
   fills (ContentSidebar); the top bar's Content / Visual editor switch
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
