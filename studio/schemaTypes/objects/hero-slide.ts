import {defineField, defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons/Image'

// One of the home hero dial's five states: the caption beside the dial, the
// photograph in its round frame, and the full-screen photograph behind it.
export const heroSlide = defineType({
  name: 'heroSlide',
  title: 'Dial slide',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'caption',
      type: 'string',
      description: 'The short line beside the dial.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      title: 'Dial photo',
      type: 'image',
      description: 'Shown inside the dial’s round frame.',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'background',
      title: 'Background photo',
      type: 'image',
      description: 'Fills the whole hero behind the dial and the headline.',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'caption', media: 'photo'},
  },
})
