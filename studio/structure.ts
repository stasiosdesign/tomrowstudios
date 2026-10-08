import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {BasketIcon} from '@sanity/icons/Basket'
import {DashboardIcon} from '@sanity/icons/Dashboard'
import {DatabaseIcon} from '@sanity/icons/Database'
import {DocumentIcon} from '@sanity/icons/Document'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {UsersIcon} from '@sanity/icons/Users'
import type {ComponentType} from 'react'
import {CollectionPane, type CollectionOptions} from './components/CollectionPane'
import {ContentHome} from './components/ContentHome'
import {ContentSidebar, type SidebarGroup, type SidebarItem} from './components/ContentSidebar'
import {SIDEBAR_WIDTH} from './page'
import {PAGES} from './schemaTypes/pages'
import {schemaTypes} from './schemaTypes'

/* The Content tool: a sidebar (ContentSidebar), then the panes each of its
   entries opens.

   Overview         the Content tool's home (ContentHome): the two groups
                    below again, as cards. Content opens on it.
   Page editor      the site's fixed pages, one document each (a singleton
                    whose ID is its type; sanity.config.ts stops copies being
                    made). The Architecture page is here; the projects on it
                    are not.
   CMS collections  the repeatable content: every item of a type, as a table
                    (CollectionPane) that opens each item beside it.

   The sidebar and the overview read the same list (groups, below): its
   names, icons and descriptions are written once, here.

   Each collection pane takes the edit and create intents for its type, so a
   search result, a link from the visual editor or "New" open inside it; the
   sidebar takes the pages'. Clients are edited from the Home page's logo
   wall and have no place in the sidebar. */

const iconOf = (type: string): ComponentType | undefined =>
  (schemaTypes.find((schemaType) => schemaType.name === type) as {icon?: ComponentType} | undefined)?.icon

/** The pages, in the sidebar's order and with its names; each described for its card on the overview */
const PAGE_ITEMS: {type: string; title: string; description: string}[] = [
  {type: 'homePage', title: 'Home', description: 'The hero, client logos, photo slider, recognition and galleries.'},
  {type: 'influencePage', title: 'Influence', description: 'The opening, reach figures, approach, origins, insights and the book.'},
  {type: 'architecturePage', title: 'Architectural', description: 'The header above the projects, which are a collection.'},
  {type: 'shopPage', title: 'Shop', description: 'The opening, catalogue heading, testimonials and FAQ.'},
  {type: 'partnersPage', title: 'Partner', description: 'The opening, clients, services, results and enquiry.'},
  {type: 'privacyPage', title: 'Privacy policy', description: 'The privacy policy: its heading and text.'},
  {type: 'termsPage', title: 'Terms of use', description: 'The terms of use: their heading and text.'},
].filter((item) => PAGES.some((page) => page.type === item.type))

/** The collections, in the sidebar's order */
export const COLLECTIONS: (CollectionOptions & {icon: ComponentType; description: string})[] = [
  {
    type: 'project',
    title: 'Projects',
    singular: 'project',
    nameField: 'title',
    orderField: 'sortOrder',
    icon: ProjectsIcon,
    description: 'The architecture projects: the Architecture slider and each project’s page.',
  },
  {
    type: 'shopItem',
    title: 'Shop',
    singular: 'item',
    nameField: 'title',
    orderField: 'sortOrder',
    icon: BasketIcon,
    description: 'The products, each with its own page in the shop.',
  },
  {
    type: 'partner',
    title: 'Partners',
    singular: 'partner',
    nameField: 'name',
    orderField: 'sortOrder',
    icon: UsersIcon,
    description: 'Partner case studies, on the Partners page and its archive.',
  },
].filter((collection) => schemaTypes.some((schemaType) => schemaType.name === collection.type))

const collectionId = (type: string) => `collection-${type}`

/** The overview's entry in the sidebar, and its pane's ID */
const OVERVIEW: SidebarItem = {id: 'overview', title: 'Overview', icon: DashboardIcon}

/** The sidebar's two groups, and the overview's two sections of cards */
const GROUPS: SidebarGroup[] = [
  {
    id: 'pages',
    title: 'Page Editor',
    icon: DocumentsIcon,
    description: 'The site’s fixed pages, one document each.',
    items: PAGE_ITEMS.map((page) => ({id: page.type, title: page.title, icon: iconOf(page.type) ?? DocumentIcon, description: page.description})),
  },
  {
    id: 'collections',
    title: 'CMS Collections',
    icon: DatabaseIcon,
    description: 'The repeatable content: every item of a type, as a table.',
    items: COLLECTIONS.map((collection) => ({id: collectionId(collection.type), title: collection.title, icon: collection.icon, description: collection.description})),
  },
]

// No pane title: Sanity then leaves out the pane's own header, and the
// collection names itself once, with its count (CollectionPane)
const collectionPane = (S: StructureBuilder, {icon: _icon, description: _description, ...options}: (typeof COLLECTIONS)[number]) =>
  S.component(CollectionPane)
    .id(collectionId(options.type))
    .options(options)
    .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && params.type === options.type)
    .child((documentId: string) => S.document().documentId(documentId).schemaType(options.type))

const pagePane = (S: StructureBuilder, page: {type: string; title: string}) =>
  S.document().schemaType(page.type).documentId(page.type).title(`${page.title} page`)

// No pane title either: the overview names itself, like a collection
const overviewPane = (S: StructureBuilder) => S.component(ContentHome).id(OVERVIEW.id).options({title: OVERVIEW.title, groups: GROUPS})

export const structure: StructureResolver = (S) =>
  // A component pane's width options (minWidth, maxWidth) come from its spec:
  // the sidebar keeps to one narrow column, whatever is open beside it
  S.component({component: ContentSidebar, id: 'content', minWidth: SIDEBAR_WIDTH, maxWidth: SIDEBAR_WIDTH} as unknown as Parameters<typeof S.component>[0])
    .id('content')
    .title('Content')
    .options({overview: OVERVIEW, groups: GROUPS})
    .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && typeof params.type === 'string' && PAGES.some((page) => page.type === params.type))
    .child((id: string, context: {params?: Record<string, string | undefined>}) => {
      if (id === OVERVIEW.id) return overviewPane(S)
      const page = PAGE_ITEMS.find((item) => item.type === id)
      if (page) return pagePane(S, page)
      const collection = COLLECTIONS.find((item) => collectionId(item.type) === id)
      if (collection) return collectionPane(S, collection)
      // An intent for a document that isn't a page: the document on its own
      const type = context.params?.type ?? 'project'
      return S.document().documentId(id).schemaType(type)
    })
