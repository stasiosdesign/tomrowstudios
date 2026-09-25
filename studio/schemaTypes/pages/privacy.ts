import {defineType} from 'sanity'
import {LockIcon} from '@sanity/icons/Lock'
import {bodyField, headingField, pageSection} from '../shared/page-section'

// The Privacy page: its title, and the text under it once there is one. A
// singleton with the fixed ID "privacyPage".
export const privacyPage = defineType({
  name: 'privacyPage',
  title: 'Privacy page',
  type: 'document',
  icon: LockIcon,
  fields: [pageSection('header', 'Header', 'The title at the top of the page.', [headingField()]), bodyField()],
  preview: {
    prepare: () => ({title: 'Privacy page'}),
  },
})
