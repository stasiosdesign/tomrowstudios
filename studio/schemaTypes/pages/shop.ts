import {defineType} from 'sanity'
import {BasketIcon} from '@sanity/icons/Basket'
import {buttonField, headingField, imageField, labelField, leadField, pageSection} from '../shared/page-section'

// The Shop page: the hero, and the headings of the catalogue, the testimonials
// and the FAQ. The products, the quotes and the questions stay in the site's
// code. A singleton with the fixed ID "shopPage".
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
    pageSection('faq', 'FAQ', 'The heading beside the questions, and the help note under them. The questions stay in the site’s code.', [
      labelField(),
      headingField(),
      leadField('The line under the heading.', 'note', 'Note', 2),
      headingField('The heading of the help note under the questions.', 'helpHeading', 'Help heading'),
      leadField('The line under the help heading.', 'helpLead', 'Help standfirst', 2),
      buttonField('Opens the contact panel.', 'helpButton', 'Help button label'),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Shop page'}),
  },
})
