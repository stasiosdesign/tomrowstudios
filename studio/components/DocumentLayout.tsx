import {Flex} from '@sanity/ui'
import type {DocumentLayoutProps} from 'sanity'
import {styled} from 'styled-components'
import {isPageType} from '../lib/site'
import {PublishControls} from './PublishControls'

/* Around every document pane, in Content and in the Visual editor: the
   publishing control across the top, then Sanity's own header and form
   (sanity.config.ts, document.components.unstable_layout). Sanity's footer,
   which held its Publish button, is empty now that the document actions are
   gone, so it is hidden. A static page (the page editor) is marked, so
   studio.css can leave out the header controls it has no use for. */
export function DocumentLayout(props: DocumentLayoutProps) {
  return (
    <Root direction="column" height="fill" data-tomrow-document data-tomrow-page={isPageType(props.documentType) ? '' : undefined}>
      <PublishControls documentId={props.documentId} documentType={props.documentType} />
      <Flex direction="column" flex={1} style={{minHeight: 0}}>
        {props.renderDefault(props)}
      </Flex>
    </Root>
  )
}

/* This element sits directly in Sanity's row of panes, beside the sidebar:
   it takes all the width left, or the editor stays as narrow as its content */
const Root = styled(Flex)`
  flex: 1 1 0;
  min-width: 0;

  & [data-testid='pane-footer'] {
    display: none;
  }
`
