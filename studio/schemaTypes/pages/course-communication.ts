import {defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {headingField, imageField, leadField, pageSection} from '../shared/page-section'

// The Architecture communication package page: the header and the two parts
// of the write-up, each a heading and a photo. The paragraphs, the tags, the
// details and the related products stay in the site's code. A singleton with
// the fixed ID "courseCommunicationPage".
export const courseCommunicationPage = defineType({
  name: 'courseCommunicationPage',
  title: 'Communication package page',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    pageSection('header', 'Header', 'The full-width photo, the title and the standfirst.', [
      imageField('The photo behind the title.'),
      headingField(),
      leadField(),
    ]),
    pageSection('overview', 'Overview', 'The first part of the write-up. The paragraphs stay in the site’s code.', [
      headingField(),
      imageField('The wide photo under the paragraphs.'),
    ]),
    pageSection('details', 'What is included', 'The second part of the write-up. The paragraphs and the list stay in the site’s code.', [
      headingField(),
      imageField('The wide photo under the paragraphs.'),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Communication package page'}),
  },
})
