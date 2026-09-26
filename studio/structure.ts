import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {BasketIcon} from '@sanity/icons/Basket'
import {DocumentIcon} from '@sanity/icons/Document'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {UsersIcon} from '@sanity/icons/Users'
import type {ComponentType} from 'react'
import {CollectionPane, type CollectionOptions} from './components/CollectionPane'
import {ContentSidebar, type SidebarGroup} from './components/ContentSidebar'
import {PAGES} from './schemaTypes/pages'
import {schemaTypes} from './schemaTypes'

/* The Content tool: a sidebar in two accordion groups (ContentSidebar), then
   the panes each item opens.

   Page editor      the site's fixed pages, one document each (a singleton
                    whose ID is its type; sanity.config.ts stops copies being
                    made). The Architecture page is here; the projects on it
                    are not.
   CMS collections  the repeatable content: every item of a type, as a table
                    (CollectionPane) that opens each item beside it.

   Each collection pane takes the edit and create intents for its type, so a
   search result, a link from the visual editor or "New" open inside it; the
   sidebar takes the pages'. Clients are edited from the Home page's logo
   wall and have no place in the sidebar. */

const iconOf = (type: string): ComponentType | undefined =>
  (schemaTypes.find((schemaType) => schemaType.name === type) as {icon?: ComponentType} | undefined)?.icon

/** The pages, in the sidebar's order and with its names */
const PAGE_ITEMS: {type: string; title: string}[] = [
  {type: 'homePage', title: 'Home'},
  {type: 'influencePage', title: 'Influence'},
  {type: 'architecturePage', title: 'Architectural'},
  {type: 'shopPage', title: 'Shop'},
  {type: 'partnersPage', title: 'Partner'},
  {type: 'privacyPage', title: 'Privacy policy'},
  {type: 'termsPage', title: 'Terms of use'},
].filter((item) => PAGES.some((page) => page.type === item.type))

/** The collections, in the sidebar's order */
export const COLLECTIONS: (CollectionOptions & {icon: ComponentType})[] = [
  {
    type: 'project',
    title: 'Projects',
    singular: 'project',
    nameField: 'title',
    orderField: 'sortOrder',
    icon: ProjectsIcon,
  },
  {
    type: 'shopItem',
    title: 'Shop',
    singular: 'item',
    nameField: 'title',
    orderField: 'sortOrder',
    icon: BasketIcon,
  },
  {
    type: 'partner',
    title: 'Partners',
    singular: 'partner',
    nameField: 'name',
    orderField: 'sortOrder',
    icon: UsersIcon,
  },
].filter((collection) => schemaTypes.some((schemaType) => schemaType.name === collection.type))

const collectionId = (type: string) => `collection-${type}`

/** The sidebar's width: a compact column, like the reference's CMS Collections list */
export const SIDEBAR_WIDTH = 248

const collectionPane = (S: StructureBuilder, {icon: _icon, ...options}: (typeof COLLECTIONS)[number]) =>
  S.component(CollectionPane)
    .id(collectionId(options.type))
    .title(options.title)
    .options(options)
    .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && params.type === options.type)
    .child((documentId: string) => S.document().documentId(documentId).schemaType(options.type))

const pagePane = (S: StructureBuilder, page: {type: string; title: string}) =>
  S.document().schemaType(page.type).documentId(page.type).title(`${page.title} page`)

export const structure: StructureResolver = (S) => {
  const groups: SidebarGroup[] = [
    {id: 'pages', title: 'Page editor', items: PAGE_ITEMS.map((page) => ({id: page.type, title: page.title, icon: iconOf(page.type) ?? DocumentIcon}))},
    {id: 'collections', title: 'CMS collections', items: COLLECTIONS.map((collection) => ({id: collectionId(collection.type), title: collection.title, icon: collection.icon}))},
  ]
  // A component pane's width options (minWidth, maxWidth) come from its spec:
  // the sidebar keeps to one narrow column, whatever is open beside it
  return S.component({component: ContentSidebar, id: 'content', minWidth: SIDEBAR_WIDTH, maxWidth: SIDEBAR_WIDTH} as unknown as Parameters<typeof S.component>[0])
    .id('content')
    .title('Content')
    .options({groups})
    .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && typeof params.type === 'string' && PAGES.some((page) => page.type === params.type))
    .child((id: string, context: {params?: Record<string, string | undefined>}) => {
      const page = PAGE_ITEMS.find((item) => item.type === id)
      if (page) return pagePane(S, page)
      const collection = COLLECTIONS.find((item) => collectionId(item.type) === id)
      if (collection) return collectionPane(S, collection)
      // An intent for a document that isn't a page: the document on its own
      const type = context.params?.type ?? 'project'
      return S.document().documentId(id).schemaType(type)
    })
}
