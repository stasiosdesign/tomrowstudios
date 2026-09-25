import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {Badge, Card, Flex, Stack, Text} from '@sanity/ui'
import {type ObjectFieldProps} from 'sanity'

// One section of the home page in the form: a full-width bar with the
// section's name and what it is, which opens and closes the section on a click
// anywhere along it, in place of Sanity's small chevron and title. A problem
// anywhere inside shows on the bar, so a folded section still says when
// something in it needs fixing before the page can be published. Open, the
// section's fields sit under the bar, inside the same frame.
export function SectionField(props: ObjectFieldProps) {
  const {children, collapsed, description, onCollapse, onExpand, title, validation} = props
  const open = !collapsed
  const hasError = validation.some((marker) => marker.level === 'error')
  const hasWarning = !hasError && validation.some((marker) => marker.level === 'warning')

  return (
    <Card border radius={3} overflow="hidden">
      <Card
        as="button"
        type="button"
        aria-expanded={open}
        onClick={open ? onCollapse : onExpand}
        padding={4}
        style={{cursor: 'pointer'}}
        __unstable_focusRing
      >
        <Flex align="center" gap={3}>
          <Stack flex={1} gap={3}>
            <Text size={2} weight="medium">
              {title}
            </Text>
            {description && (
              <Text size={1} muted>
                {description}
              </Text>
            )}
          </Stack>
          {hasError && <Badge tone="critical">Needs fixing</Badge>}
          {hasWarning && <Badge tone="caution">Has a warning</Badge>}
          <Text size={2} muted>
            <ChevronDownIcon
              style={{transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s ease'}}
            />
          </Text>
        </Flex>
      </Card>
      {open && (
        <Card borderTop padding={4}>
          {children}
        </Card>
      )}
    </Card>
  )
}
