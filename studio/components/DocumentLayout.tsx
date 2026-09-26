import {Flex} from '@sanity/ui'
import type {DocumentLayoutProps} from 'sanity'
import {styled} from 'styled-components'
import {PublishControls} from './PublishControls'

/* Around every document pane, in Content and in the Visual editor: the
   publishing control across the top, then Sanity's own header and form
   (sanity.config.ts, document.components.unstable_layout). Sanity's footer,
   which held its Publish button, is empty now that the document actions are
   gone, so it is hidden. */
export function DocumentLayout(props: DocumentLayoutProps) {
  return (
    <Root direction="column" height="fill" data-tomrow-document>
      <PublishControls documentId={props.documentId} documentType={props.documentType} />
      <Flex direction="column" flex={1} style={{minHeight: 0}}>
        {props.renderDefault(props)}
      </Flex>
    </Root>
  )
}

const Root = styled(Flex)`
  & [data-testid='pane-footer'] {
    display: none;
  }
`
