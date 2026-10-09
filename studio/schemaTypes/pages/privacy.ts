import {defineType} from 'sanity'
import {LockIcon} from '@sanity/icons/Lock'
import {headingField, pageSection, textSection} from '../shared/page-section'

// The Privacy page: its title, and the policy itself, each a folded section of
// the form. A singleton with the fixed ID "privacyPage".
export const privacyPage = defineType({
  name: 'privacyPage',
  title: 'Privacy page',
  type: 'document',
  icon: LockIcon,
  fields: [
    pageSection('header', 'Header', 'The title at the top of the page.', [headingField()]),
    textSection('Policy text', 'The privacy policy itself: headings, paragraphs, lists and links.'),
  ],
  preview: {
    prepare: () => ({title: 'Privacy page'}),
  },
})
