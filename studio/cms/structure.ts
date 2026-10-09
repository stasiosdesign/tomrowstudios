import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {DashboardIcon} from '@sanity/icons/Dashboard'
import {DatabaseIcon} from '@sanity/icons/Database'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {CollectionPane} from './components/CollectionPane'
import {ContentHome} from './components/ContentHome'
import {ContentSidebar, type SidebarGroup, type SidebarItem} from './components/ContentSidebar'
import type {Cms, CmsCollection} from './config'
import {SIDEBAR_WIDTH} from './page'

/* The Content tool: a sidebar (ContentSidebar), then the panes each of its
   entries opens.

   Overview         the Content tool's home (ContentHome): the two groups
                    below again, as cards. Content opens on it.
   Page editor      the site's fixed pages, one document each (a singleton
                    whose ID is its type; studio.ts stops copies being
                    made).
   CMS collections  the repeatable content: every item of a type, as a table
                    (CollectionPane) that opens each item beside it.

   The pages and the collections, with their names, icons and descriptions,
   are the project's (cms/config.ts: pageEditor, collections); the sidebar
   and the overview read the same list (groups, below).

   Each collection pane takes the edit and create intents for its type, so a
   search result, a link from the visual editor or "New" open inside it; the
   sidebar takes the pages'. A type that is neither (one edited from a page,
   say) has no place in the sidebar, and opens on its own. */

export const collectionId = (type: string) => `collection-${type}`

/** The overview's entry in the sidebar, and its pane's ID */
const OVERVIEW: SidebarItem = {id: 'overview', title: 'Overview', icon: DashboardIcon}

/** The sidebar's two groups, and the overview's two sections of cards */
const groupsOf = (cms: Cms): SidebarGroup[] => [
  {
    id: 'pages',
    title: 'Page Editor',
    icon: DocumentsIcon,
    description: 'The site’s fixed pages, one document each.',
    items: cms.pageEditor.map((page) => ({id: page.type, title: page.title, icon: page.icon, description: page.description})),
  },
  {
    id: 'collections',
    title: 'CMS Collections',
    icon: DatabaseIcon,
    description: 'The repeatable content: every item of a type, as a table.',
    items: cms.collections.map((collection) => ({id: collectionId(collection.type), title: collection.title, icon: collection.icon, description: collection.description})),
  },
]

// No pane title: Sanity then leaves out the pane's own header, and the
// collection names itself once, with its count (CollectionPane)
const collectionPane = (S: StructureBuilder, {icon: _icon, description: _description, listedOn: _listedOn, ...options}: CmsCollection) =>
  S.component(CollectionPane)
    .id(collectionId(options.type))
    .options(options)
    .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && params.type === options.type)
    .child((documentId: string) => S.document().documentId(documentId).schemaType(options.type))

const pagePane = (S: StructureBuilder, page: {type: string; title: string}) =>
  S.document().schemaType(page.type).documentId(page.type).title(`${page.title} page`)

// No pane title either: the overview names itself, like a collection
const overviewPane = (S: StructureBuilder, groups: SidebarGroup[]) => S.component(ContentHome).id(OVERVIEW.id).options({title: OVERVIEW.title, groups})

export function createStructure(cms: Cms): StructureResolver {
  const groups = groupsOf(cms)
  // An intent that names no type: the first collection's
  const fallbackType = cms.collections[0]?.type
  return (S) =>
    // A component pane's width options (minWidth, maxWidth) come from its spec:
    // the sidebar keeps to one narrow column, whatever is open beside it
    S.component({component: ContentSidebar, id: 'content', minWidth: SIDEBAR_WIDTH, maxWidth: SIDEBAR_WIDTH} as unknown as Parameters<typeof S.component>[0])
      .id('content')
      .title('Content')
      .options({overview: OVERVIEW, groups})
      .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && typeof params.type === 'string' && cms.isPage(params.type))
      .child((id: string, context: {params?: Record<string, string | undefined>}) => {
        if (id === OVERVIEW.id) return overviewPane(S, groups)
        const page = cms.pageEditor.find((item) => item.type === id)
        if (page) return pagePane(S, page)
        const collection = cms.collections.find((item) => collectionId(item.type) === id)
        if (collection) return collectionPane(S, collection)
        // An intent for a document that isn't a page: the document on its own
        const type = context.params?.type ?? fallbackType
        return type ? S.document().documentId(id).schemaType(type) : S.document().documentId(id)
      })
}
