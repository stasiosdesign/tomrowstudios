import {defineField, defineType} from 'sanity'
import {BookIcon} from '@sanity/icons/Book'
import {buttonField, headingField, imageField, leadField, pageSection} from '../shared/page-section'

// The Book page: the header, the two headings of the write-up, and the map's
// caption and buttons. The paragraphs, the tags, the details and the related
// products stay in the site's code. A singleton with the fixed ID "bookPage".
export const bookPage = defineType({
  name: 'bookPage',
  title: 'Book page',
  type: 'document',
  icon: BookIcon,
  fields: [
    pageSection('header', 'Header', 'The full-width photo, the title and the standfirst.', [
      imageField('The photo behind the title.'),
      headingField(),
      leadField(),
    ]),
    pageSection('overview', 'Overview', 'The first part of the write-up, with the wide photo under it. The paragraphs stay in the site’s code.', [
      headingField(),
      imageField('The wide photo under the paragraphs.'),
    ]),
    pageSection('inside', 'Inside the book', 'The second part of the write-up. The paragraphs stay in the site’s code.', [
      headingField(),
    ]),
    pageSection('atlas', 'Atlas', 'The caption and the two buttons under the world map.', [
      defineField({
        name: 'caption',
        title: 'Caption',
        type: 'text',
        rows: 2,
        validation: (rule) => rule.required(),
      }),
      buttonField('Links to the Influence page.', 'primaryButton', 'First button label'),
      buttonField('Links to the Shop.', 'secondaryButton', 'Second button label'),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Book page'}),
  },
})
