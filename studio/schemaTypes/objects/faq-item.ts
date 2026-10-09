import {defineField, defineType} from 'sanity'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {BlockItem} from '../../cms'

// One question of the Shop page's FAQ and its answer: a block of a
// repeatable page component, edited within the page (BlockItem), never a
// CMS collection of its own
export const faqItem = defineType({
  name: 'faqItem',
  title: 'Question',
  type: 'object',
  icon: HelpCircleIcon,
  components: {item: BlockItem},
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'question', subtitle: 'answer'},
  },
})
