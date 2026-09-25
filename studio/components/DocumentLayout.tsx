import {Card, Flex, Stack, Text} from '@sanity/ui'
import type {DocumentLayoutProps} from 'sanity'
import {useIntentLink} from 'sanity/router'
import {styled} from 'styled-components'
import {isLiveId, publishedId} from '../lib/live'
import {PublishBar} from './PublishBar'

/* Around every document pane: Sanity's own header and form, with the
   publishing bar along the bottom in place of Sanity's Publish button
   (sanity.config.ts, document.components.unstable_layout). Sanity's footer
   would sit under the bar saying the same thing, so it is hidden here.

   A live copy (live.<id>) is never edited: production is built from it, so
   opening one, from a search result say, shows a note and the way to the
   real document instead. */
export function DocumentLayout(props: DocumentLayoutProps) {
  const {documentId, documentType} = props
  if (isLiveId(documentId)) return <LiveCopyNotice id={publishedId(documentId)} type={documentType} />
  return (
    <Root direction="column" height="fill">
      <Flex direction="column" flex={1} style={{minHeight: 0}}>
        {props.renderDefault(props)}
      </Flex>
      <PublishBar documentId={documentId} documentType={documentType} />
    </Root>
  )
}

const Root = styled(Flex)`
  & [data-testid='pane-footer'] {
    display: none;
  }
`

function LiveCopyNotice({id, type}: {id: string; type: string}) {
  const {href, onClick} = useIntentLink({intent: 'edit', params: {id, type}})
  return (
    <Flex align="center" justify="center" height="fill" padding={5}>
      <Card border radius={3} padding={4} style={{maxWidth: 420}}>
        <Stack gap={3}>
          <Text size={2} weight="medium">
            This is the live site’s copy
          </Text>
          <Text size={1} muted>
            The live site is built from this copy. It changes only through “Publish live”, so edit the item itself:
          </Text>
          <Text size={1}>
            <a href={href} onClick={onClick}>
              Open the item
            </a>
          </Text>
        </Stack>
      </Card>
    </Flex>
  )
}
