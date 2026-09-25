import {defineArrayMember, defineField, defineType} from 'sanity'
import {ImagesIcon} from '@sanity/icons/Images'
import {altTextField} from '../shared/alt-text'

const LAYOUTS = [
  {title: 'Grid, on the page columns', value: 'grid'},
  {title: 'Pairs, two across', value: 'pairs'},
]

const FRAMINGS = [
  {title: 'Landscape (3:2)', value: 'wide'},
  {title: 'Square', value: 'square'},
  {title: 'Portrait (2:3)', value: 'tall'},
  {title: 'Uncropped', value: 'natural'},
]

const titleOf = (options: {title: string; value: string}[], value?: string) =>
  options.find((option) => option.value === value)?.title

// A band of pictures; click any of them to zoom.
export const imageGallery = defineType({
  name: 'imageGallery',
  title: 'Image gallery',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'images',
      type: 'array',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: [altTextField]})],
      options: {layout: 'grid'},
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'layout',
      type: 'string',
      options: {list: LAYOUTS, layout: 'radio'},
      initialValue: 'grid',
    }),
    defineField({
      name: 'framing',
      type: 'string',
      description: 'The shape every picture in the gallery is cropped to.',
      options: {list: FRAMINGS, layout: 'radio'},
      initialValue: 'wide',
    }),
  ],
  preview: {
    select: {layout: 'layout', framing: 'framing', media: 'images.0'},
    prepare: ({layout, framing, media}) => ({
      title: 'Image gallery',
      subtitle: [titleOf(LAYOUTS, layout), titleOf(FRAMINGS, framing)].filter(Boolean).join(' · '),
      media,
    }),
  },
})
