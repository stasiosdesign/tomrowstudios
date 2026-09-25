import {defineType} from 'sanity'
import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {headingField, labelField, pageSection} from '../shared/page-section'

// The Architecture page: its label and title. The projects on its slider are
// the Projects documents. A singleton with the fixed ID "architecturePage".
export const architecturePage = defineType({
  name: 'architecturePage',
  title: 'Architecture page',
  type: 'document',
  icon: BlockElementIcon,
  fields: [
    pageSection('header', 'Header', 'The words on the project slider: the small line at the top and the title at the bottom.', [
      labelField('The small line above the slider.'),
      headingField('The title under the slider.'),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Architecture page'}),
  },
})
