import {defineField, defineType} from 'sanity'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {buttonField, headingField, imageField, labelField, leadField, pageSection} from '../shared/page-section'

// The Influence page, one section per part, in the order the page shows them.
// The timeline, the numbers table and the map stay in the site's code. A
// singleton with the fixed ID "influencePage".
export const influencePage = defineType({
  name: 'influencePage',
  title: 'Influence page',
  type: 'document',
  icon: EarthGlobeIcon,
  fields: [
    pageSection('hero', 'Opening', 'The introduction and the photo under it.', [
      labelField(),
      headingField(),
      leadField(),
      imageField('The wide photo under the introduction.'),
    ]),
    pageSection('reach', 'Reach', 'The one big figure.', [
      labelField('The small line above the figure.'),
      defineField({
        name: 'number',
        title: 'Figure',
        type: 'string',
        description: 'Shown as a counting-up figure; digits and separators only, such as 180,700.',
        validation: (rule) => rule.required(),
      }),
      leadField('The line under the figure.', 'text', 'Caption', 2),
    ]),
    pageSection('approach', 'Approach', 'The statement in large type.', [
      labelField('The small line above the statement.'),
      leadField(undefined, 'statement', 'Statement', 4),
    ]),
    pageSection('origins', 'Origins', 'The heading beside the timeline. The timeline’s steps stay in the site’s code.', [
      labelField(),
      headingField(),
    ]),
    pageSection('insights', 'Insights', 'The heading and standfirst above the numbers. The rows stay in the site’s code.', [
      labelField(),
      headingField(),
      leadField(),
    ]),
    pageSection('atlas', 'Global reach', 'The heading above the world map.', [labelField(), headingField()]),
    pageSection('book', 'The book', 'The book feature under the map, with its button.', [
      labelField(),
      headingField(),
      leadField(),
      buttonField('Links to the Book page.'),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Influence page'}),
  },
})
