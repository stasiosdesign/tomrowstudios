import {Box} from '@sanity/ui'
import type {ObjectSchemaType} from 'sanity'
import {useDocumentTitle} from 'sanity/structure'
import {useCms} from '../context'
import {PANE_HEADING_PADDING_Y, PaneHeading} from './PaneHeading'
import {useInVisualEditor} from './PreviewControls'

/* A document's title in Content, in the header row beside its actions
   (sanity.config.ts, document.unstable_languageFilter, the header's slot for
   controls), as the pane heading a collection's name uses too (PaneHeading):
   a static page's name, or a CMS item's current title, the same one Sanity
   would show, changing as its Title field is edited. DocumentLayout drops
   the smaller label row and the form's own title, so the document is named
   once. Nothing in the Visual editor, where the form names it. */
export function PaneTitle({schemaType}: {schemaType: ObjectSchemaType}) {
  const inVisualEditor = useInVisualEditor()
  const {isPage} = useCms()
  const {title} = useDocumentTitle()
  if (inVisualEditor) return null
  const typeTitle = schemaType.title ?? schemaType.name
  const name = isPage(schemaType.name) ? typeTitle : title?.trim() || `Untitled ${typeTitle.toLowerCase()}`
  return (
    <Box data-tomrow-pane-title flex={1} style={{minWidth: 0, paddingBlock: PANE_HEADING_PADDING_Y}}>
      <PaneHeading title={name}>{name}</PaneHeading>
    </Box>
  )
}
