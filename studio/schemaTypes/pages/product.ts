import {defineType} from 'sanity'
import {PresentationIcon} from '@sanity/icons/Presentation'
import {headingField, imageField, leadField, pageSection} from '../shared/page-section'

// The Architectural presentation masterclass page: the header and the two
// parts of the write-up, each a heading and a photo. The paragraphs, the tags,
// the details and the related products stay in the site's code. A singleton
// with the fixed ID "productPage".
export const productPage = defineType({
  name: 'productPage',
  title: 'Masterclass page',
  type: 'document',
  icon: PresentationIcon,
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
    pageSection('details', 'What you will learn', 'The second part of the write-up. The paragraphs and the module list stay in the site’s code.', [
      headingField(),
      imageField('The wide photo under the paragraphs.'),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Masterclass page'}),
  },
})
