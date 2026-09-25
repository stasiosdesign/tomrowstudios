import {defineField} from 'sanity'

export const altTextField = defineField({
  name: 'alt',
  title: 'Alternative text',
  type: 'string',
  description: 'What the picture shows, for screen readers and search engines.',
  validation: (rule) => rule.required().warning('Alt text helps screen-reader users and search'),
})
