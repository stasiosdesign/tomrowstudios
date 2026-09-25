import {defineArrayMember, defineField, type FieldDefinition} from 'sanity'
import {SectionField} from '../../components/SectionField'
import {optionalAltTextField} from './alt-text'

// The building blocks of the page documents (schemaTypes/pages): one section
// per part of a page, each a folded bar in the form (SectionField), holding
// the few things the page's code no longer fixes: a label, a heading, a
// standfirst, a picture, a button's words. Every page's own file is a list of
// these, so it reads as an outline of the page.

const SECTION = {
  options: {collapsible: true, collapsed: true},
  components: {field: SectionField},
}

/** One section of a page: a folded object with the given fields, all of it required. */
export const pageSection = (name: string, title: string, description: string, fields: FieldDefinition[]) =>
  defineField({
    name,
    title,
    type: 'object',
    description,
    ...SECTION,
    validation: (rule) => rule.required(),
    fields,
  })

/** The small line above a heading (the tagline). */
export const labelField = (description = 'The small line above the heading.', name = 'label', title = 'Label') =>
  defineField({name, title, type: 'string', description, validation: (rule) => rule.required()})

/** A heading, on one line. */
export const headingField = (description?: string, name = 'heading', title = 'Heading') =>
  defineField({name, title, type: 'string', description, validation: (rule) => rule.required()})

/** A standfirst or other short run of text, a few lines long. */
export const leadField = (description?: string, name = 'lead', title = 'Standfirst', rows = 3) =>
  defineField({name, title, type: 'text', rows, description, validation: (rule) => rule.required()})

/** A photograph, cropped and focused in the Studio, with optional alt text. */
export const imageField = (description?: string, name = 'image', title = 'Photo') =>
  defineField({
    name,
    title,
    type: 'image',
    description,
    options: {hotspot: true},
    fields: [optionalAltTextField],
    validation: (rule) => rule.required(),
  })

/** The words on a button; where it leads stays in the site's code, so say so in the description. */
export const buttonField = (description: string, name = 'button', title = 'Button label') =>
  defineField({name, title, type: 'string', description, validation: (rule) => rule.required()})

/** A page's written text (Privacy, Terms): headings, paragraphs, lists and links. Optional. */
export const bodyField = () =>
  defineField({
    name: 'body',
    title: 'Text',
    type: 'array',
    description: 'The page’s text. Empty until it is written.',
    of: [
      defineArrayMember({
        type: 'block',
        styles: [
          {title: 'Paragraph', value: 'normal'},
          {title: 'Heading', value: 'h2'},
          {title: 'Subheading', value: 'h3'},
        ],
        lists: [
          {title: 'Bullets', value: 'bullet'},
          {title: 'Numbered', value: 'number'},
        ],
        marks: {
          decorators: [
            {title: 'Strong', value: 'strong'},
            {title: 'Emphasis', value: 'em'},
          ],
          annotations: [
            {
              name: 'link',
              title: 'Link',
              type: 'object',
              fields: [
                defineField({
                  name: 'href',
                  title: 'Address',
                  type: 'url',
                  validation: (rule) =>
                    rule.required().uri({scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true}),
                }),
              ],
            },
          ],
        },
      }),
    ],
  })
