import {defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons/Image'
import {altTextField} from '../shared/alt-text'

// A single picture across the full width of the page.
export const featureImage = defineType({
  name: 'featureImage',
  title: 'Full-width image',
  type: 'image',
  icon: ImageIcon,
  options: {hotspot: true},
  fields: [altTextField],
  validation: (rule) => rule.required(),
  preview: {
    select: {alt: 'alt', media: 'asset'},
    prepare: ({alt, media}) => ({title: alt || 'Full-width image', subtitle: 'Full-width image', media}),
  },
})
