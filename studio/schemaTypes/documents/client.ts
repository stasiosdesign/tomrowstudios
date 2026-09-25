import {defineField, defineType} from 'sanity'
import {CaseIcon} from '@sanity/icons/Case'

// A client whose logo runs in the home page's logo wall.
export const client = defineType({
  name: 'client',
  title: 'Client',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      description: 'Also the logo’s alternative text.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'logo',
      type: 'image',
      description: 'White artwork on a transparent background (PNG). The logo wall turns it black.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Order',
      type: 'number',
      description: 'Position in the logo wall, 1 first.',
      validation: (rule) => rule.integer().min(1),
    }),
  ],
  orderings: [{title: 'Order', name: 'sortOrderAsc', by: [{field: 'sortOrder', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', media: 'logo'},
  },
})
