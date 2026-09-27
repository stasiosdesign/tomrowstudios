import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {Badge, Box, Flex, Text} from '@sanity/ui'
import {useContext, useEffect, useId, useRef} from 'react'
import {type ObjectFieldProps} from 'sanity'
import {styled} from 'styled-components'
import {Collapse, MOTION_EASE, MOTION_MS} from './Collapse'
import {FORM_WIDTH} from './FieldLayout'
import {SectionGroup} from './PageInput'

/* One section of a page in the form: a row in a table-like list, in the
   page's order, that opens and closes on a click anywhere along it (or Enter
   and Space on the keyboard) to show the section's fields directly beneath.
   A problem anywhere inside shows on the row, so a folded section still says
   when something in it needs fixing before the page can be published. The
   fields open and close with a short height transition (Collapse). One
   section of a page is open at a time: opening this one closes the others
   (PageInput's section group), however it opened. */
export function SectionField(props: ObjectFieldProps) {
  const {children, collapsed, description, onCollapse, onExpand, title, validation} = props
  const open = !collapsed
  const hasError = validation.some((marker) => marker.level === 'error')
  const hasWarning = !hasError && validation.some((marker) => marker.level === 'warning')
  const id = useId()

  // One open at a time: when this section opens, the page's group closes
  // the one that was open, and keeps this one's close until it shuts
  const group = useContext(SectionGroup)
  const collapseRef = useRef(onCollapse)
  collapseRef.current = onCollapse
  useEffect(() => {
    if (!open || !group) return undefined
    return group.open(id, () => collapseRef.current())
  }, [open, group, id])

  return (
    <div data-open={open ? '' : undefined} data-tomrow-section>
      <RowButton type="button" id={`${id}-row`} aria-expanded={open} aria-controls={`${id}-fields`} onClick={open ? onCollapse : onExpand}>
        <Flex align="center" gap={3}>
          <Box flex={1}>
            <Text size={1} weight="medium">
              {title}
            </Text>
          </Box>
          {description && (
            <Box flex={2} style={{minWidth: 0}} className="section-row__description">
              <Text size={1} muted textOverflow="ellipsis">
                {description}
              </Text>
            </Box>
          )}
          {hasError && <Badge tone="critical">Needs fixing</Badge>}
          {hasWarning && <Badge tone="caution">Has a warning</Badge>}
          <Text size={1} muted>
            <ChevronDownIcon style={{transform: open ? 'rotate(180deg)' : undefined, transition: `transform ${MOTION_MS}ms ${MOTION_EASE}`}} />
          </Text>
        </Flex>
      </RowButton>
      <Collapse open={open}>
        <Fields id={`${id}-fields`} role="region" aria-labelledby={`${id}-row`}>
          <div className="section-row__fields">{children}</div>
        </Fields>
      </Collapse>
    </div>
  )
}

/* One row of the Studio's grid (--tomrow-row-height, its hairline included,
   studio.css), like a collection table's rows and the Content sidebar's
   beside the page editor, so their rules meet. The hairline is the row's
   own, under its title; an open section rules off its fields below them.
   The page form (PageInput) closes the gaps between the rows and rules the
   top of the list. */
const RowButton = styled.button`
  all: unset;
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  min-height: var(--tomrow-row-height);
  padding: 0 14px;
  border-bottom: 1px solid var(--card-border-color);
  cursor: pointer;

  & > [data-ui='Flex'] {
    flex: 1 1 auto;
    min-width: 0;
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

  @media (max-width: 720px) {
    .section-row__description {
      display: none;
    }
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
