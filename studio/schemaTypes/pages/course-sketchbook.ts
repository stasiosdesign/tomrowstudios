import {defineType} from 'sanity'
import {EditIcon} from '@sanity/icons/Edit'
import {headingField, imageField, leadField, pageSection} from '../shared/page-section'

// The Digital Sketchbook page: the header and the two parts of the write-up,
// each a heading and a photo. The paragraphs, the tags, the details and the
// related products stay in the site's code. A singleton with the fixed ID
// "courseSketchbookPage".
export const courseSketchbookPage = defineType({
  name: 'courseSketchbookPage',
  title: 'Digital Sketchbook page',
  type: 'document',
  icon: EditIcon,
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
    pageSection('details', 'What it covers', 'The second part of the write-up. The paragraphs and the list stay in the site’s code.', [
      headingField(),
      imageField('The wide photo under the paragraphs.'),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Digital Sketchbook page'}),
  },
})
