import type {StructureResolver} from 'sanity/structure'
import {CaseIcon} from '@sanity/icons/Case'
import {ProjectsIcon} from '@sanity/icons/Projects'

// Both lists open in the order the site shows them, set by each document's
// Order field.
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
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
