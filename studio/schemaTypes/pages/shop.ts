import {defineArrayMember, defineField, defineType} from 'sanity'
import {BasketIcon} from '@sanity/icons/Basket'
import {buttonField, headingField, imageField, labelField, leadField, pageSection} from '../shared/page-section'

// The Shop page: the hero, the headings of the catalogue and the
// testimonials, and the FAQ with its questions (a repeatable block within
// the page: objects/faq-item.ts). The products are the shop items; the
// quotes stay in the site's code. A singleton with the fixed ID "shopPage".
export const shopPage = defineType({
  name: 'shopPage',
  title: 'Shop page',
  type: 'document',
  icon: BasketIcon,
  fields: [
    pageSection('hero', 'Opening', 'The introduction, its two buttons and the photo beside it.', [
      labelField(),
      headingField(),
      leadField(),
      imageField('The square photo beside the introduction.'),
      buttonField('Scrolls down to the catalogue.', 'primaryButton', 'First button label'),
      buttonField('Links to the Book page.', 'secondaryButton', 'Second button label'),
    ]),
    pageSection('catalogue', 'Catalogue', 'The heading above the products. The products stay in the site’s code.', [
      labelField(),
      headingField(),
    ]),
    pageSection('testimonials', 'Testimonials', 'The heading above the quotes. The quotes stay in the site’s code.', [
      headingField(),
      leadField(),
    ]),
    pageSection('faq', 'FAQ', 'The heading beside the questions, the questions and their answers, and the help note under them.', [
      labelField(),
      headingField(),
      leadField('The line under the heading.', 'note', 'Note', 2),
      defineField({
        name: 'questions',
        title: 'Questions',
        type: 'array',
        description: 'In the order they show; the first opens on the page. Drag a question to move it, its menu removes or duplicates it. While there are none, the page keeps its own five.',
        of: [defineArrayMember({type: 'faqItem'})],
      }),
      headingField('The heading of the help note under the questions.', 'helpHeading', 'Help heading'),
      leadField('The line under the help heading.', 'helpLead', 'Help standfirst', 2),
      buttonField('Opens the contact panel.', 'helpButton', 'Help button label'),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Shop page'}),
  },
})
