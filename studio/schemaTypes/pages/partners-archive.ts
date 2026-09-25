import {defineType} from 'sanity'
import {ArchiveIcon} from '@sanity/icons/Archive'
import {headingField, leadField, pageSection} from '../shared/page-section'

// The Partners archive page: its title and standfirst. The grid of case
// studies stays in the site's code. A singleton with the fixed ID
// "partnersArchivePage".
export const partnersArchivePage = defineType({
  name: 'partnersArchivePage',
  title: 'Partners archive page',
  type: 'document',
  icon: ArchiveIcon,
  fields: [
    pageSection('intro', 'Opening', 'The title and the standfirst above the grid.', [headingField(), leadField()]),
  ],
  preview: {
    prepare: () => ({title: 'Partners archive page'}),
  },
})
