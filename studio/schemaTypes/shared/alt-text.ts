import {defineField} from 'sanity'

export const altTextField = defineField({
  name: 'alt',
  title: 'Alternative text',
  type: 'string',
  description: 'What the picture shows, for screen readers and search engines.',
  validation: (rule) => rule.required().warning('Alt text helps screen-reader users and search'),
})

// For the home page's photographs, which the site has always shown without
// one: there to fill in, but no warning while it is empty
export const optionalAltTextField = defineField({
  name: 'alt',
  title: 'Alternative text',
  type: 'string',
  description: 'What the picture shows, for screen readers. Optional.',
})
