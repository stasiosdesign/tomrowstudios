import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {CaseIcon} from '@sanity/icons/Case'
import {DocumentIcon} from '@sanity/icons/Document'
import {ProjectsIcon} from '@sanity/icons/Projects'
import type {ComponentType} from 'react'
import {CollectionPane, type CollectionOptions} from './components/CollectionPane'
import {PAGES} from './schemaTypes/pages'
import {schemaTypes} from './schemaTypes'

/* The Content sidebar, in two labelled parts:

   Page editor      the site's fixed pages, one document each (a singleton
                    whose ID is its type: structure opens that one document,
                    and sanity.config.ts stops copies being made). The
                    Architecture page is here; the projects on it are not.
   CMS collections  the repeatable content: every item of a type, as a table
                    (CollectionPane) that opens each item beside it.

   A collection pane also takes the edit and create intents for its type, so
   a search result, a link from the visual editor or "New" all open inside
   it, with the list beside the item. */

const iconOf = (type: string): ComponentType | undefined =>
  (schemaTypes.find((schemaType) => schemaType.name === type) as {icon?: ComponentType} | undefined)?.icon

/** The collections, in the order the sidebar lists them */
export const COLLECTIONS: (CollectionOptions & {icon: ComponentType})[] = [
  {
    type: 'project',
    title: 'Projects',
    singular: 'project',
    nameField: 'title',
    defaultColumns: ['coverImage', 'context', 'year', 'sortOrder'],
    orderField: 'sortOrder',
    icon: ProjectsIcon,
  },
  {
    type: 'client',
    title: 'Clients',
    singular: 'client',
    nameField: 'name',
    defaultColumns: ['logo', 'sortOrder'],
    orderField: 'sortOrder',
    icon: CaseIcon,
  },
]

const collectionItem = (S: StructureBuilder, {icon, ...options}: (typeof COLLECTIONS)[number]) =>
  S.listItem()
    .title(options.title)
    .icon(icon)
    .id(`${options.type}s`)
    .child(
      S.component(CollectionPane)
        .id(`${options.type}s`)
        .title(options.title)
        .options(options)
        .canHandleIntent((intent, params) => (intent === 'edit' || intent === 'create') && params.type === options.type)
        .child((documentId: string) => S.document().documentId(documentId).schemaType(options.type)),
    )

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.divider().title('Page editor'),
      ...PAGES.map((page) =>
        S.listItem()
          .title(page.title)
          .icon(iconOf(page.type) ?? DocumentIcon)
          .id(page.type)
          .child(S.document().schemaType(page.type).documentId(page.type).title(`${page.title} page`)),
      ),
      S.divider().title('CMS collections'),
      ...COLLECTIONS.map((collection) => collectionItem(S, collection)),
    ])
