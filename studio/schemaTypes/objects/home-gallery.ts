import {defineField, defineType} from 'sanity'
import {ImagesIcon} from '@sanity/icons/Images'
import {fixedPhotosField} from '../shared/fixed-photos'

// One of the four photo bands on the home page: a heading and a line under
// it, four square photos across the grid and a button. Where the button goes
// is fixed in the site; only its label is edited.
export const homeGallery = defineType({
  name: 'homeGallery',
  title: 'Gallery',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lead',
      title: 'Standfirst',
      type: 'text',
      rows: 2,
      description: 'The line under the heading.',
      validation: (rule) => rule.required(),
    }),
    fixedPhotosField(4, 'Four photos, left to right, each cropped square.'),
    defineField({
      name: 'button',
      title: 'Button label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
  ],
})
