import {defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons/Document'
import {bodyField, headingField, pageSection} from '../shared/page-section'

// The Terms page: its title, and the text under it once there is one. A
// singleton with the fixed ID "termsPage".
export const termsPage = defineType({
  name: 'termsPage',
  title: 'Terms page',
  type: 'document',
  icon: DocumentIcon,
  fields: [pageSection('header', 'Header', 'The title at the top of the page.', [headingField()]), bodyField()],
  preview: {
    prepare: () => ({title: 'Terms page'}),
  },
})
