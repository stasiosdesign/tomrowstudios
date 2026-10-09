import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {Badge, Text} from '@sanity/ui'
import {useId} from 'react'
import {type ObjectFieldProps} from 'sanity'
import {css, styled} from 'styled-components'
import {Collapse, MOTION_EASE, MOTION_MS} from './Collapse'
import {FORM_WIDTH} from './FieldLayout'
import {showInPreview, useInVisualEditor} from './PreviewControls'

/* One section of a page in the form: a row in a table-like list, in the
   page's order, that opens and closes on a click anywhere along it (or Enter
   and Space on the keyboard) to show the section's fields directly beneath.
   A problem anywhere inside shows on the row, so a folded section still says
   when something in it needs fixing before the page can be published. The
   fields open and close with a short height transition (Collapse). Each
   section opens and closes on its own, and others stay as they are; the
   header's Expand all / Collapse all opens or closes them all (Sections.tsx,
   listed there by FieldLayout).

   In Content a row is the section's name and description, under the list's
   column heads (PageInput). In the Visual editor's narrow panel it is the
   name alone, a little taller, and a click also scrolls the preview to the
   section (showInPreview). */
export function SectionField(props: ObjectFieldProps) {
  const {children, collapsed, description, name, onCollapse, onExpand, title, validation} = props
  const inVisualEditor = useInVisualEditor()
  const open = !collapsed
  const hasError = validation.some((marker) => marker.level === 'error')
  const hasWarning = !hasError && validation.some((marker) => marker.level === 'warning')
  const id = useId()

  const toggle = () => {
    if (open) onCollapse()
    else onExpand()
    if (inVisualEditor) showInPreview(name)
  }

  return (
    <div data-open={open ? '' : undefined} data-tomrow-section>
      <RowButton
        type="button"
        id={`${id}-row`}
        aria-expanded={open}
        aria-controls={`${id}-fields`}
        data-names-only={inVisualEditor ? '' : undefined}
        onClick={toggle}
      >
        <Text size={1} weight="medium">
          {title}
        </Text>
        {!inVisualEditor && (
          <span className="section-row__description">
            {description && (
              <Text size={1} muted textOverflow="ellipsis">
                {description}
              </Text>
            )}
          </span>
        )}
        <span>
          {hasError && <Badge tone="critical">Needs fixing</Badge>}
          {hasWarning && <Badge tone="caution">Has a warning</Badge>}
        </span>
        <Text size={1} muted>
          <ChevronDownIcon style={{transform: open ? 'rotate(180deg)' : undefined, transition: `transform ${MOTION_MS}ms ${MOTION_EASE}`}} />
        </Text>
      </RowButton>
      <Collapse open={open}>
        <Fields id={`${id}-fields`} role="region" aria-labelledby={`${id}-row`}>
          <div className="section-row__fields">{children}</div>
        </Fields>
      </Collapse>
    </div>
  )
}

/* A section row's columns, shared with the list's column heads (PageInput)
   so the two line up: the name, then the description from a third of the
   width on (a fixed share, so a badge never moves it), any badge, and the
   chevron. Without descriptions (the Visual editor, a narrow screen): the
   name, any badge, the chevron. */
export const sectionColumns = css`
  display: grid;
  grid-template-columns: 33% minmax(0, 1fr) auto 16px;
  column-gap: 12px;
  align-items: center;

  & > .section-row__description {
    min-width: 0;
  }

  & > :last-child {
    justify-self: end;
  }

  &[data-names-only] {
    grid-template-columns: minmax(0, 1fr) auto 16px;
  }

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr) auto 16px;

    & > .section-row__description {
      display: none;
    }
  }
`

/* One row of the Studio's grid (--tomrow-row-height, its hairline included,
   studio.css), like a collection table's rows, so their rules meet; a little
   taller in the Visual editor, where the names stand alone. The hairline is
   the row's own, under its title; an open section rules off its fields
   below them. The page form (PageInput) closes the gaps between the rows and
   rules the top of the list. */
const RowButton = styled.button`
  all: unset;
  ${sectionColumns}
  width: 100%;
  box-sizing: border-box;
  min-height: var(--tomrow-row-height);
  padding: 0 14px;
  border-bottom: 1px solid var(--card-border-color);
  cursor: pointer;

  &[data-names-only] {
    min-height: 48px;
  }

  &:hover {
    background: var(--tomrow-hover);
  }

  [data-open] > & {
    background: var(--tomrow-selected);
  }

  &:focus-visible {
    outline: 2px solid var(--card-focus-ring-color);
    outline-offset: -2px;
  }
`

/* The opened section: the row's full width, its fields inset like the
   table's cells, and held to the width a CMS item's form uses (FORM_WIDTH),
   its small fields sharing rows the same way (FieldLayout) */
const Fields = styled.div`
  padding: 24px 14px 36px;
  border-bottom: 1px solid var(--card-border-color);

  & > .section-row__fields {
    max-width: ${FORM_WIDTH}px;
  }
`
