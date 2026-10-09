import {defineField} from 'sanity'

/* A picture's alternative text, for screen readers and search engines.
   Hidden from the forms for now, to keep them uncluttered: the field stays
   in the schema, so text already written is kept and the site still uses it
   (falling back to a fixed text or none where it is empty), and nothing
   warns about a field no one can see. Show it again by removing `hidden`. */
export const altTextField = defineField({
  name: 'alt',
  title: 'Alternative text',
  type: 'string',
  description: 'What the picture shows, for screen readers and search engines.',
  hidden: true,
})

// For the home page's photographs, which the site has always shown without one
export const optionalAltTextField = defineField({
  name: 'alt',
  title: 'Alternative text',
  type: 'string',
  description: 'What the picture shows, for screen readers. Optional.',
  hidden: true,
})
