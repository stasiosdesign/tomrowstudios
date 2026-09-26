import {defineArrayMember, defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'
import {HomePageInput} from '../../components/HomePageInput'
import {SectionField} from '../../components/SectionField'
import {altTextField} from '../shared/alt-text'
import {FIXED_LENGTH, fixedPhotosField} from '../shared/fixed-photos'

// The home page, one field per section, in the order the page shows them. The
// navigation, the footer and where every button leads stay in the site's code.
// A singleton: structure.ts opens the one document with the fixed ID
// "homePage", and sanity.config.ts stops copies being made or it being deleted.
// Its form opens with a link to the visual editor (HomePageInput).

// Every section starts folded, so the document reads as an outline of the
// page, each one a bar that opens and closes on a click (SectionField).
// Clicking something in the visual editor's preview opens its section.
const SECTION = {
  options: {collapsible: true, collapsed: true},
  components: {field: SectionField},
}

export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  icon: HomeIcon,
  components: {input: HomePageInput},
  fields: [
    defineField({
      name: 'hero',
      type: 'object',
      description: 'The full-screen opening: the headline, the dial and its photos, and two buttons.',
      ...SECTION,
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
          options: {sortable: false, disableActions: [...FIXED_LENGTH]},
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
    defineField({
      name: 'logoWall',
      title: 'Client logos',
      type: 'object',
      description: 'The red band under the hero: its label and the logos, in order.',
      ...SECTION,
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'label',
          type: 'string',
          description: 'Shown in brackets above the logos.',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'clients',
          title: 'Logos',
          type: 'array',
          description:
            'The logos in the wall, in order. Each opens the client to change its name or artwork.',
          of: [defineArrayMember({type: 'reference', to: [{type: 'client'}]})],
          options: {sortable: true},
        }),
      ],
    }),
    defineField({
      name: 'practice',
      type: 'object',
      description: 'The statement under the logos.',
      ...SECTION,
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'label',
          type: 'string',
          description: 'The small line above the statement.',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'statement',
          type: 'text',
          rows: 4,
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'slider',
      title: 'Photo slider',
      type: 'object',
      description: 'Full-width photos with a row of thumbnails; visitors click or swipe through them.',
      ...SECTION,
      validation: (rule) => rule.required(),
      fields: [
        fixedPhotosField(4, 'Four photos, in the order the slider shows them. Each is also its own thumbnail.'),
      ],
    }),
    defineField({
      name: 'recognition',
      type: 'object',
      description: 'Awards and achievements, with three stepped cards under them.',
      ...SECTION,
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'label',
          type: 'string',
          description: 'The small line above the heading.',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'heading',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'lead',
          title: 'Standfirst',
          type: 'text',
          rows: 3,
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'button',
          title: 'Button label',
          type: 'string',
          description: 'Links to the Influence page.',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'cards',
          type: 'array',
          description: 'Three cards, left to right, each set a step lower than the one before.',
          of: [defineArrayMember({type: 'homeCard'})],
          options: {disableActions: [...FIXED_LENGTH]},
          validation: (rule) => rule.required().length(3),
        }),
      ],
    }),
    defineField({
      name: 'influence',
      title: 'Gallery: Influence',
      type: 'homeGallery',
      description: 'Four photos under a heading, with a button to the Influence page.',
      ...SECTION,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'partners',
      title: 'Gallery: Partners',
      type: 'homeGallery',
      description: 'Four photos under a heading, with a button to the Partners page.',
      ...SECTION,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'projects',
      title: 'Gallery: Architecture',
      type: 'homeGallery',
      description: 'Four photos under a heading, with a button to the Architecture page.',
      ...SECTION,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'courses',
      title: 'Gallery: Shop',
      type: 'homeGallery',
      description: 'Four photos under a heading, with a button to the Shop.',
      ...SECTION,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'getInTouch',
      title: 'Get in touch',
      type: 'object',
      description:
        'The closing block with Tom’s portrait. It ends most pages of the site, not only this one, and a change here shows on all of them.',
      ...SECTION,
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'label',
          type: 'string',
          description: 'The small line above the heading.',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'title',
          title: 'Heading',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'portrait',
          type: 'image',
          options: {hotspot: true},
          fields: [altTextField],
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'lead',
          title: 'Standfirst',
          type: 'text',
          rows: 3,
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'button',
          title: 'Button label',
          type: 'string',
          description: 'Opens the contact panel.',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({title: 'Home page'}),
  },
})
