import {ArrowRightIcon} from '@sanity/icons/ArrowRight'
import {Button, Flex, Text} from '@sanity/ui'
import {createElement, type MouseEvent} from 'react'
import {usePresentationNavigate, usePresentationParams} from 'sanity/presentation'
import {useRouter} from 'sanity/router'
import {useDocumentTitle} from 'sanity/structure'
import {styled} from 'styled-components'
import type {Collection} from '../structure'
import {cmsItemPath, pageAt, pageOfType} from './navigation'

/* The Visual editor's panel for a CMS item (a project, a shop item, a
   partner): clicked in the preview, it is not edited here, beside the page,
   but in its CMS collection, so the panel says so instead of showing its
   fields (DocumentLayout): what it is and which collection holds it, Go to
   CMS item, which opens that very item in its collection in Content, and
   Dismiss, back to the page in the preview (or, where the preview is the
   item's own page, the page that lists the collection). Page Editor content
   and its repeatable blocks are edited in the panel as before. */
export function CmsItemPrompt({documentId, collection}: {documentId: string; collection: Collection}) {
  const {title} = useDocumentTitle()
  const router = useRouter()
  const navigate = usePresentationNavigate()
  const {preview} = usePresentationParams()
  const itemPath = cmsItemPath(collection.type, documentId)
  const name = title?.trim() || `Untitled ${collection.singular}`

  // The link works as a link too (a new tab, its address); a plain click stays in the Studio
  const goToItem = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    router.navigateUrl({path: itemPath})
  }
  const dismiss = () => {
    const shown = pageAt(preview)
    if (shown) navigate(undefined, {type: shown.type, id: shown.type})
    else {
      const listing = pageOfType(collection.listedOn)
      if (listing) navigate(listing.route, {type: listing.type, id: listing.type})
    }
  }

  return (
    <Wrap>
      <Prompt role="status" data-tomrow-cms-prompt>
        <Eyebrow>
          <span aria-hidden>{createElement(collection.icon)}</span>
          CMS item · {collection.title}
        </Eyebrow>
        <Name>{name}</Name>
        <Text size={1} muted>
          This {collection.singular} belongs to the {collection.title} collection, so it isn’t edited here on the page. Open it in its collection to
          change it.
        </Text>
        <Flex gap={2} wrap="wrap" style={{marginTop: 16}}>
          <Button as="a" href={itemPath} onClick={goToItem} tone="primary" iconRight={ArrowRightIcon} text="Go to CMS item" fontSize={1} padding={3} />
          <Button mode="ghost" text="Dismiss" fontSize={1} padding={3} onClick={dismiss} />
        </Flex>
      </Prompt>
    </Wrap>
  )
}

const Wrap = styled.div`
  padding: 14px;
`

// A card of the Studio's own: a hairline frame a shade lighter than the
// panel, its corners the cards' (studio.css)
const Prompt = styled.div`
  padding: 16px;
  border: 1px solid var(--card-border-color);
  border-radius: var(--tomrow-card-radius);
  background: rgb(255 255 255 / 0.03);
`

// "CMS item · Projects": small, quiet and set apart, with the collection's icon
const Eyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--card-muted-fg-color);

  & > span {
    display: flex;
    font-size: 17px;
  }
`

const Name = styled.p`
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: #ffffff;
`
