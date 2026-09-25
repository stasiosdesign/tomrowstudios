import type {StructureResolver} from 'sanity/structure'
import {CaseIcon} from '@sanity/icons/Case'
import {HomeIcon} from '@sanity/icons/Home'
import {ProjectsIcon} from '@sanity/icons/Projects'

// The home page first: a singleton, always the one document with the ID
// "homePage". Then the two lists, in the order the site shows them, set by
// each document's Order field.
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Home page')
        .icon(HomeIcon)
        .id('homePage')
        .child(S.document().schemaType('homePage').documentId('homePage').title('Home page')),
      S.divider(),
      S.listItem()
        .title('Projects')
        .icon(ProjectsIcon)
        .schemaType('project')
        .child(
          S.documentTypeList('project')
            .title('Projects')
            .defaultOrdering([{field: 'sortOrder', direction: 'asc'}]),
        ),
      S.listItem()
        .title('Clients')
        .icon(CaseIcon)
        .schemaType('client')
        .child(
          S.documentTypeList('client')
            .title('Clients')
            .defaultOrdering([{field: 'sortOrder', direction: 'asc'}]),
        ),
    ])
