import {ArrowRightIcon} from '@sanity/icons/ArrowRight'
import {DesktopIcon} from '@sanity/icons/Desktop'
import {Card, Flex, Stack, Text} from '@sanity/ui'
import {useCallback} from 'react'
import {type ObjectInputProps} from 'sanity'
import {useIntentLink, useRouterState} from 'sanity/router'
import {styled} from 'styled-components'

// The Home page form, with the way into the visual editor at the top: the page
// itself beside this same form, where clicking anything on the page opens its
// field and every change shows as it is typed. Left out in the visual editor,
// which already is that view.
export function HomePageInput(props: ObjectInputProps) {
  const inVisualEditor = useRouterState(useCallback((state) => state.tool === 'presentation', []))

  return (
    <Stack gap={5}>
      {!inVisualEditor && <EditVisuallyCard />}
      <Sections>{props.renderDefault(props)}</Sections>
    </Stack>
  )
}

// The section bars (SectionField) as one list: the form's own 52px between
// fields, cut to 12px. If Sanity changes that markup, the list just goes back
// to the wider spacing.
const Sections = styled.div`
  & > [data-ui='Stack'] {
    gap: 12px;
  }
`

// The whole card is the link. The red edge is the mark the site's own calls to
// action carry.
function EditVisuallyCard() {
  const {href, onClick} = useIntentLink({
    intent: 'edit',
    params: {id: 'homePage', type: 'homePage', mode: 'presentation', presentation: 'presentation', preview: '/'},
  })

  return (
    <Card
      as="a"
      href={href}
      onClick={onClick}
      border
      radius={3}
      padding={4}
      style={{borderLeft: '3px solid #dd341d'}}
      __unstable_focusRing
    >
      <Flex align="center" gap={4}>
        <Text size={3}>
          <DesktopIcon />
        </Text>
        <Stack flex={1} gap={3}>
          <Text size={2} weight="medium">
            Edit the page visually
          </Text>
          <Text size={1} muted>
            Opens the home page with this form beside it. Click anything on the page to edit it, and
            see each change as you type.
          </Text>
        </Stack>
        <Text size={2}>
          <ArrowRightIcon />
        </Text>
      </Flex>
    </Card>
  )
}
