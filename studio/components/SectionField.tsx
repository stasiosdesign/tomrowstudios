import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {Badge, Box, Flex, Text} from '@sanity/ui'
import {useId} from 'react'
import {type ObjectFieldProps} from 'sanity'
import {styled} from 'styled-components'

/* One section of a page in the form: a row in a table-like list, in the
   page's order, that opens and closes on a click anywhere along it (or Enter
   and Space on the keyboard) to show the section's fields directly beneath.
   A problem anywhere inside shows on the row, so a folded section still says
   when something in it needs fixing before the page can be published. */
export function SectionField(props: ObjectFieldProps) {
  const {children, collapsed, description, onCollapse, onExpand, title, validation} = props
  const open = !collapsed
  const hasError = validation.some((marker) => marker.level === 'error')
  const hasWarning = !hasError && validation.some((marker) => marker.level === 'warning')
  const id = useId()

  return (
    <Row data-open={open ? '' : undefined} data-tomrow-section>
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
            <ChevronDownIcon style={{transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s ease'}} />
          </Text>
        </Flex>
      </RowButton>
      {open && (
        <Fields id={`${id}-fields`} role="region" aria-labelledby={`${id}-row`}>
          <div className="section-row__fields">{children}</div>
        </Fields>
      )}
    </Row>
  )
}

/* Ruled and spaced like a collection table's rows (CollectionPane): the page
   form (PageInput) closes the gaps between them and rules the top of the list */
const Row = styled.div`
  border-bottom: 1px solid var(--card-border-color);
`

const RowButton = styled.button`
  all: unset;
  display: block;
  width: 100%;
  box-sizing: border-box;
  /* The table's 43px rows: Sanity's Text trims its line box to the
     letters, so it needs more padding than a table cell for the same height */
  padding: 17px 14px;
  cursor: pointer;

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
   table's cells, and held to a width that reads well however wide the pane */
const Fields = styled.div`
  padding: 24px 14px 36px;
  border-top: 1px solid var(--card-border-color);

  & > .section-row__fields {
    max-width: 880px;
  }
`
