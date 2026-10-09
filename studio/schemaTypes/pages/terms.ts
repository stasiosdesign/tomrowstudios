import {defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons/Document'
import {headingField, pageSection, textSection} from '../shared/page-section'

// The Terms page: its title, and the terms themselves, each a folded section of
// the form. A singleton with the fixed ID "termsPage".
export const termsPage = defineType({
  name: 'termsPage',
  title: 'Terms page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    pageSection('header', 'Header', 'The title at the top of the page.', [headingField()]),
    textSection('Terms text', 'The terms of use themselves: headings, paragraphs, lists and links.'),
  ],
  preview: {
    prepare: () => ({title: 'Terms page'}),
  },
})
