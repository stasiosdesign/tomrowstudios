import {defineArrayMember, defineField, defineType} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'
import {altTextField} from '../shared/alt-text'
import {bodyField} from '../shared/page-section'

// A partner: a slide on the Partners page's case-study slider, a picture in
// the Partners archive grid and, when it has a case study, the drawer both of
// them open. Its logo, if it has one, runs in the Partners page's logo
// marquee.

// A slug names the drawer (#case-<slug>), so it may only use lowercase
// letters, numbers and single hyphens
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// What "Generate" makes from the name: "D5 Render" -> "d5-render"
const slugify = (input: string) =>
  input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
    .replace(/-+$/, '')

export const partner = defineType({
  name: 'partner',
  title: 'Partner',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      description: 'Shown under the picture on the slider.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      description:
        'Names the case-study drawer. Lowercase letters, numbers and hyphens, e.g. “epic-games”; “Generate” makes one from the name.',
      options: {source: 'name', maxLength: 96, slugify},
      validation: (rule) =>
        rule.required().custom((slug) =>
          !slug?.current || SLUG_PATTERN.test(slug.current)
            ? true
            : `Use lowercase letters, numbers and single hyphens only, e.g. “${slugify(slug.current) || 'epic-games'}”`,
        ),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Order',
      type: 'number',
      description: 'Position on the Partners page slider and in the archive grid, 1 first.',
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: 'logo',
      type: 'image',
      description:
        'White artwork on a transparent background (PNG), for the moving row of logos on the Partners page. Optional.',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      description: 'The picture on the slider and in the archive grid.',
      options: {hotspot: true},
      fields: [altTextField],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'caseStudy',
      title: 'Case study',
      type: 'object',
      description:
        'The drawer that opens from the slider and the archive. Leave the title empty and the partner shows without one.',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({name: 'title', type: 'string'}),
        defineField({name: 'standfirst', type: 'text', rows: 3}),
        defineField({
          name: 'facts',
          type: 'object',
          description: 'The list beside the text.',
          fields: [
            defineField({name: 'client', type: 'string'}),
            defineField({name: 'date', type: 'string'}),
            defineField({name: 'services', type: 'string'}),
            defineField({name: 'output', type: 'string'}),
            defineField({
              name: 'website',
              type: 'url',
              validation: (rule) => rule.uri({scheme: ['http', 'https']}),
            }),
          ],
        }),
        bodyField(),
        defineField({
          name: 'image',
          title: 'Wide picture',
          type: 'image',
          description: 'The full-width picture under the text.',
          options: {hotspot: true},
          fields: [altTextField],
        }),
        defineField({
          name: 'filmsHeading',
          title: 'Films heading',
          type: 'string',
          description: 'The heading above the gallery, e.g. “The films”.',
        }),
        defineField({
          name: 'filmsLead',
          title: 'Films standfirst',
          type: 'text',
          rows: 2,
        }),
        defineField({
          name: 'gallery',
          type: 'array',
          description: 'The pictures in the swiper under the heading. No gallery without pictures.',
          of: [
            defineArrayMember({
              type: 'image',
              options: {hotspot: true},
              fields: [altTextField],
            }),
          ],
        }),
      ],
    }),
  ],
  orderings: [{title: 'Order', name: 'sortOrderAsc', by: [{field: 'sortOrder', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', subtitle: 'caseStudy.title', media: 'coverImage'},
  },
})
