import {defineField, defineType} from 'sanity'
import {StarIcon} from '@sanity/icons/Star'

const KINDS = [
  {title: 'Award won', value: 'won'},
  {title: 'Award nomination or selection', value: 'award'},
  {title: 'Detail (programme, school, year…)', value: 'detail'},
]

// One of the labels beside a project's standfirst: an award, or a plain fact.
export const projectCredit = defineType({
  name: 'projectCredit',
  title: 'Award or detail',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'note',
      type: 'string',
      description: 'For awards, the result and year, e.g. “Winner 2022” or “Nominated 2023”.',
    }),
    defineField({
      name: 'kind',
      type: 'string',
      options: {list: KINDS, layout: 'radio'},
      initialValue: 'detail',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'name', note: 'note', kind: 'kind'},
    prepare: ({title, note, kind}) => ({
      title,
      subtitle: note || KINDS.find((option) => option.value === kind)?.title,
    }),
  },
})
