import {Box, Heading} from '@sanity/ui'
import type {ObjectSchemaType} from 'sanity'
import {isPageType} from '../lib/site'
import {useInVisualEditor} from './PreviewControls'

/* A static page's title in the page editor: the large one, in the header row
   beside Show more (sanity.config.ts, document.unstable_languageFilter, the
   header's slot for controls). studio.css drops the smaller label row and the
   form's own title, so the page is named once. Nothing elsewhere. */
export function PaneTitle({schemaType}: {schemaType: ObjectSchemaType}) {
  const inVisualEditor = useInVisualEditor()
  if (inVisualEditor || !isPageType(schemaType.name)) return null
  return (
    <Box data-tomrow-pane-title flex={1} style={{minWidth: 0}}>
      <Heading as="h1" size={4} textOverflow="ellipsis">
        {schemaType.title ?? schemaType.name}
      </Heading>
    </Box>
  )
}
