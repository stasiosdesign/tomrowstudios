import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons/Document'
import {optionalAltTextField} from '../shared/alt-text'

// One of the three stepped cards under Recognition on the home page: a photo,
// a title and a sentence.
export const homeCard = defineType({
  name: 'homeCard',
  title: 'Card',
  type: 'object',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      description: 'Cropped to a wide landscape.',
      options: {hotspot: true},
      fields: [optionalAltTextField],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'text', media: 'image'},
  },
})
