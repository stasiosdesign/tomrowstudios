import {defineArrayMember, defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'

// The home page. For now only its hero is edited here; the rest of the page is
// still written in src/pages/index.astro. A singleton: structure.ts opens the
// one document with the fixed ID "homePage", and sanity.config.ts stops copies
// being made or it being deleted.
export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({
      name: 'hero',
      type: 'object',
      options: {collapsible: false},
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'headline',
          type: 'text',
          rows: 2,
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'slides',
          title: 'Dial slides',
          type: 'array',
          description:
            'The dial’s five states, in the order it turns through them. Edit what each one shows; the dial always has five.',
          of: [defineArrayMember({type: 'heroSlide'})],
          options: {
            sortable: false,
            disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate'],
          },
          validation: (rule) => rule.required().length(5),
        }),
        defineField({
          name: 'primaryButton',
          title: 'First button label',
          type: 'string',
          description: 'Opens the contact panel.',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'secondaryButton',
          title: 'Second button label',
          type: 'string',
          description: 'Links to the Influence page.',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({title: 'Home page'}),
  },
})
