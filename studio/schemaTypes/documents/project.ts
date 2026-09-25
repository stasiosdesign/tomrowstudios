import {defineArrayMember, defineField, defineType} from 'sanity'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {altTextField} from '../shared/alt-text'

// An architecture project: a card on the Architecture page's slider and its
// own page at project-<slug>.html.
export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  icon: ProjectsIcon,
  groups: [
    {name: 'overview', title: 'Overview', default: true},
    {name: 'content', title: 'Page content'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'overview',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'shortTitle',
      title: 'Short title',
      type: 'string',
      group: 'overview',
      description:
        'Used on the Architecture slider, the “Next project” link and the page-transition label. Leave empty to use the title.',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'overview',
      description: 'The page address: project-<slug>.html',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Order',
      type: 'number',
      group: 'overview',
      description: 'Position on the Architecture page, 1 first. Also sets which project is “next”.',
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: 'context',
      type: 'string',
      group: 'overview',
      description:
        'Shown after “Architecture —” on the page and on the slider, e.g. “MArch 2”, “Dissertation” or a place.',
    }),
    defineField({
      name: 'year',
      type: 'number',
      group: 'overview',
      validation: (rule) => rule.integer().min(1900).max(2100),
    }),
    defineField({
      name: 'lead',
      title: 'Standfirst',
      type: 'text',
      rows: 3,
      group: 'overview',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'credits',
      title: 'Awards and details',
      type: 'array',
      group: 'overview',
      description:
        'The labels beside the standfirst: awards first, then facts such as the programme, school and year.',
      of: [defineArrayMember({type: 'projectCredit'})],
    }),
    defineField({
      name: 'portfolio',
      title: 'Portfolio PDF',
      type: 'file',
      group: 'overview',
      description: 'For the “Download Portfolio” buttons. Upload it here…',
      options: {accept: 'application/pdf'},
    }),
    defineField({
      name: 'portfolioUrl',
      title: 'Portfolio link',
      type: 'url',
      group: 'overview',
      description: '…or link to a PDF hosted elsewhere. An uploaded PDF wins if both are set.',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      group: 'overview',
      description: 'On the Architecture slider, and behind the “Next project” link from the project before.',
      options: {hotspot: true},
      fields: [altTextField],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Page content',
      type: 'array',
      group: 'content',
      description: 'The page below the header, top to bottom.',
      of: [
        defineArrayMember({type: 'featureImage'}),
        defineArrayMember({type: 'imageGallery'}),
        defineArrayMember({type: 'textSection'}),
      ],
    }),
  ],
  orderings: [{title: 'Order', name: 'sortOrderAsc', by: [{field: 'sortOrder', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', order: 'sortOrder', context: 'context', year: 'year', media: 'coverImage'},
    prepare: ({title, order, context, year, media}) => ({
      title,
      subtitle: [order && String(order).padStart(2, '0'), context, year].filter(Boolean).join(' — '),
      media,
    }),
  },
})
