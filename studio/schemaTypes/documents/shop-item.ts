import {defineArrayMember, defineField, defineType} from 'sanity'
import {BasketIcon} from '@sanity/icons/Basket'
import {altTextField, optionalAltTextField} from '../shared/alt-text'
import {bodyField} from '../shared/page-section'

// Something in the shop (a course, a package, a book, a guide): a card on the
// Shop page's grid and its own page at /<slug>.

// A slug is the last part of the page's address, so it may only use lowercase
// letters, numbers and single hyphens
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// What "Generate" makes from the title: "An Architect’s Digital Sketchbook" ->
// "an-architect-s-digital-sketchbook"
const slugify = (input: string) =>
  input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
    .replace(/-+$/, '')

/** A photograph, cropped and focused in the Studio, with optional alt text. */
const photo = (name: string, title: string, description: string, required = true) =>
  defineField({
    name,
    title,
    type: 'image',
    description,
    options: {hotspot: true},
    fields: [optionalAltTextField],
    validation: required ? (rule) => rule.required() : undefined,
  })

/** The words on a link and where it leads. */
const link = (name: string, title: string, description: string) =>
  defineField({
    name,
    title,
    type: 'object',
    description,
    fields: [
      defineField({name: 'label', title: 'Label', type: 'string', validation: (rule) => rule.required()}),
      defineField({
        name: 'href',
        title: 'Address',
        type: 'string',
        description: 'A page on this site (/shop), a full address (https://…) or “#contact” for the contact panel.',
        validation: (rule) => rule.required(),
      }),
    ],
  })

/** One of the two parts of the write-up: a heading, the paragraphs, and a wide photo under them. */
const richSection = (name: string, title: string, description: string, extra: ReturnType<typeof defineField>[] = []) =>
  defineField({
    name,
    title,
    type: 'object',
    group: 'page',
    description,
    options: {collapsible: true, collapsed: false},
    validation: (rule) => rule.required(),
    fields: [
      defineField({name: 'heading', title: 'Heading', type: 'string', validation: (rule) => rule.required()}),
      bodyField(),
      ...extra,
      photo('image', 'Photo', 'The wide photo under the paragraphs. Optional; it opens full-screen when clicked.', false),
    ],
  })

export const shopItem = defineType({
  name: 'shopItem',
  title: 'Shop item',
  type: 'document',
  icon: BasketIcon,
  groups: [
    {name: 'card', title: 'Card', default: true},
    {name: 'page', title: 'Page'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'card',
      description: 'The name on the card and at the top of the page.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'card',
      description:
        'The page address: /<slug>. Lowercase letters, numbers and hyphens, e.g. “book”; “Generate” makes one from the title.',
      options: {source: 'title', maxLength: 96, slugify},
      validation: (rule) =>
        rule.required().custom((slug) =>
          !slug?.current || SLUG_PATTERN.test(slug.current)
            ? true
            : `Use lowercase letters, numbers and single hyphens only, e.g. “${slugify(slug.current) || 'book'}”`,
        ),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Order',
      type: 'number',
      group: 'card',
      description: 'Position in the shop grid, 1 first. The “Related” items on each page follow the same order.',
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: 'card',
      title: 'Card',
      type: 'object',
      group: 'card',
      description: 'The card on the Shop page, and in the “Related” row on the other items’ pages.',
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'image',
          title: 'Photo',
          type: 'image',
          description: 'The picture on the card.',
          options: {hotspot: true},
          fields: [optionalAltTextField],
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'kind',
          title: 'Kind',
          type: 'string',
          description: 'The small tag: Course, Package, Book, Guide…',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'meta',
          title: 'Detail',
          type: 'string',
          description: 'Beside the tag: Self-paced, Digital download, Hardcover, Free PDF…',
        }),
        defineField({
          name: 'text',
          title: 'Text',
          type: 'text',
          rows: 3,
          description: 'One sentence under the name.',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'button',
          title: 'Button label',
          type: 'string',
          description: 'The card’s button; it opens the page.',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'header',
      title: 'Header',
      type: 'object',
      group: 'page',
      description: 'The full-width photo, the standfirst under the title, and the tags.',
      options: {collapsible: true, collapsed: false},
      validation: (rule) => rule.required(),
      fields: [
        photo('image', 'Photo', 'The photo behind the title.'),
        defineField({
          name: 'lead',
          title: 'Standfirst',
          type: 'text',
          rows: 3,
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'tags',
          title: 'Tags',
          type: 'array',
          description: 'Up to three short labels under the standfirst, e.g. “Self-paced”, “224 pages”.',
          of: [defineArrayMember({type: 'string'})],
          validation: (rule) => rule.max(3),
        }),
      ],
    }),
    defineField({
      name: 'details',
      title: 'Details',
      type: 'object',
      group: 'page',
      description: 'The list beside the standfirst, and the link that closes it.',
      options: {collapsible: true, collapsed: false},
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'metaRows',
          title: 'Rows',
          type: 'array',
          description: 'Label and value, e.g. “Author — Thomas Rowntree”.',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'metaRow',
              fields: [
                defineField({name: 'label', title: 'Label', type: 'string', validation: (rule) => rule.required()}),
                defineField({name: 'value', title: 'Value', type: 'string', validation: (rule) => rule.required()}),
              ],
              preview: {
                select: {label: 'label', value: 'value'},
                prepare: ({label, value}) => ({title: value, subtitle: label}),
              },
            }),
          ],
        }),
        defineField({
          name: 'cta',
          title: 'Link',
          type: 'object',
          description: 'The last row: its label, the link’s words and where it leads.',
          fields: [
            defineField({
              name: 'rowLabel',
              title: 'Row label',
              type: 'string',
              description: 'The label of the last row, e.g. “Order”, “Enrol”, “Get it”.',
            }),
            defineField({name: 'label', title: 'Link text', type: 'string', validation: (rule) => rule.required()}),
            defineField({
              name: 'href',
              title: 'Address',
              type: 'string',
              description: 'A full address (https://…), or “#contact” to open the contact panel.',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'opensContact',
              title: 'Opens the contact panel',
              type: 'boolean',
              description: 'On: the link opens the contact panel instead of leaving the page.',
              initialValue: false,
            }),
          ],
        }),
      ],
    }),
    richSection('overview', 'Overview', 'The first part of the write-up.'),
    richSection('whatYouGet', 'What you get', 'The second part of the write-up, with the list of modules or parts.', [
      defineField({
        name: 'modules',
        title: 'Modules',
        type: 'array',
        description: 'The list under the paragraphs: a name (“Module 1”, “One”) and what it covers. Optional.',
        of: [
          defineArrayMember({
            type: 'object',
            name: 'module',
            fields: [
              defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
              defineField({name: 'text', title: 'Text', type: 'string', validation: (rule) => rule.required()}),
            ],
            preview: {
              select: {name: 'name', text: 'text'},
              prepare: ({name, text}) => ({title: text, subtitle: name}),
            },
          }),
        ],
      }),
    ]),
    defineField({
      name: 'atlas',
      title: 'Map band',
      type: 'object',
      group: 'page',
      description: 'The full-width map with a caption and two buttons (the book). Leave empty for no band.',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({
          name: 'image',
          title: 'Map',
          type: 'image',
          description: 'The full-width picture.',
          fields: [altTextField],
        }),
        defineField({name: 'caption', title: 'Caption', type: 'text', rows: 2}),
        link('primaryButton', 'First button', 'The filled button.'),
        link('secondaryButton', 'Second button', 'The outlined button.'),
      ],
    }),
  ],
  orderings: [{title: 'Order', name: 'sortOrderAsc', by: [{field: 'sortOrder', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'card.kind', media: 'card.image'},
  },
})
