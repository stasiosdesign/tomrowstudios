import {defineArrayMember, defineField, defineType} from 'sanity'
import {TextIcon} from '@sanity/icons/Text'

// The project write-up: a short label beside a few paragraphs.
export const textSection = defineType({
  name: 'textSection',
  title: 'Text',
  type: 'object',
  icon: TextIcon,
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      initialValue: 'The project',
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{title: 'Paragraph', value: 'normal'}],
          lists: [],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
            ],
          },
        }),
      ],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {label: 'label', body: 'body'},
    prepare: ({label, body}) => {
      const block = (body ?? []).find((item: {_type: string}) => item._type === 'block')
      return {
        title: label || 'Text',
        subtitle: block?.children?.map((child: {text?: string}) => child.text).join('') ?? '',
      }
    },
  },
})
