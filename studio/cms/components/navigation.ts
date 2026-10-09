import type {Cms, PageLink} from '../config'
import {collectionId} from '../structure'

/* The Studio's addresses for a page or a CMS item, in Content and in the
   Visual editor, so each can open the other on the same thing (the top
   bar's switch and All pages, StudioNavbar; the Visual editor's prompt for a
   CMS item, CmsItemPrompt). The Studio is served at its root. The pages and
   collections are the project's (useCms). */

export type {PageLink}

/** The Visual editor on a page: the page in the preview, its document beside it */
export const visualEditorPath = (page: PageLink) => `/presentation/${page.type}/${page.type}?preview=${encodeURIComponent(page.route)}`

/** Content on a page: its form in the page editor */
export const pageEditorPath = (page: PageLink) => `/structure/${page.type}`

/** Content on a CMS item: its collection, with the item open beside the list */
export const cmsItemPath = (type: string, id: string) => `/structure/${collectionId(type)};${encodeURIComponent(`${id},type=${type}`)}`

export const pageOfType = (cms: Cms, type: string | undefined) => cms.pageLinks.find((page) => page.type === type)

export const collectionOfType = (cms: Cms, type: string | undefined) => cms.collections.find((collection) => collection.type === type)

/** The page an address on the site shows, if it is one of the page editor's (a full address or a path, its query and a closing slash aside) */
export function pageAt(cms: Cms, address: string | undefined): PageLink | undefined {
  if (!address) return undefined
  try {
    const path = new URL(address, 'https://site.invalid').pathname.replace(/(.)\/$/, '$1')
    return cms.pageLinks.find((page) => page.route === path)
  } catch {
    return undefined
  }
}

/* Where the Studio is now, read from its address: the open tool, and the
   page or CMS item it shows (Content: /structure/<page> or
   /structure/collection-<type>;<id>,type=<type>; the Visual editor:
   /presentation/<type>/<id>?preview=<address>) */
export type Place = {tool?: string; page?: PageLink; item?: {type: string; id: string}}

export function placeOf(cms: Cms, pathname: string, search: string): Place {
  const [tool, first, second] = pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part))
  if (tool === 'structure') {
    const [pane, ...siblings] = (first ?? '').split(';')
    const page = pageOfType(cms, pane)
    if (page) return {tool, page}
    const collection = cms.collections.find((item) => collectionId(item.type) === pane)
    const id = siblings[0]?.split(',')[0]
    return collection && id ? {tool, item: {type: collection.type, id}} : {tool}
  }
  if (tool === 'presentation') {
    const page = pageOfType(cms, first) ?? pageAt(cms, new URLSearchParams(search).get('preview') ?? undefined)
    const item = collectionOfType(cms, first) && second ? {type: first, id: second} : undefined
    return {tool, page, item}
  }
  return {tool}
}
