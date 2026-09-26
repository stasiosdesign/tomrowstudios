import {Box} from '@sanity/ui'
import type {ObjectSchemaType} from 'sanity'
import {isPageType} from '../lib/site'
import {PANE_HEADING_PADDING_Y, PaneHeading} from './PaneHeading'
import {useInVisualEditor} from './PreviewControls'

/* A static page's title in the page editor, in the header row opposite Show
   more (sanity.config.ts, document.unstable_languageFilter, the header's slot
   for controls): the pane heading a collection's name uses too (PaneHeading).
   DocumentLayout drops the smaller label row and the form's own title, so the
   page is named once. Nothing elsewhere. */
export function PaneTitle({schemaType}: {schemaType: ObjectSchemaType}) {
  const inVisualEditor = useInVisualEditor()
  if (inVisualEditor || !isPageType(schemaType.name)) return null
  return (
    <Box data-tomrow-pane-title flex={1} style={{minWidth: 0, paddingBlock: PANE_HEADING_PADDING_Y}}>
      <PaneHeading>{schemaType.title ?? schemaType.name}</PaneHeading>
    </Box>
  )
}
