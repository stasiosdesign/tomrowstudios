import {defineType} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'
import {buttonField, headingField, imageField, labelField, leadField, pageSection} from '../shared/page-section'

// The Partners page, one section per part, in the order the page shows them.
// The logos, the services, the testimonials, the results cards and the
// enquiry form stay in the site's code; the case studies are the Partner
// documents. Its last section is the Partners archive page's heading and
// standfirst. A singleton with the fixed ID "partnersPage".
export const partnersPage = defineType({
  name: 'partnersPage',
  title: 'Partners page',
  type: 'document',
  icon: UsersIcon,
  fields: [
    pageSection('intro', 'Opening', 'The title, the standfirst and the button above the case studies.', [
      headingField(),
      leadField(),
      buttonField('Opens the contact panel.'),
    ]),
    pageSection('clients', 'Clients', 'The heading above the moving row of logos. The logos stay in the site’s code.', [
      labelField(),
      headingField(),
      leadField('The line under the heading.', 'note', 'Note', 2),
    ]),
    pageSection('statement', 'Statement', 'The headline, the portrait, the paragraph and the button beside it.', [
      headingField('The headline. Its red full stop is added by the site.'),
      imageField('The portrait in the first column.'),
      leadField(undefined, 'lead', 'Paragraph', 4),
      buttonField('Links to the Partners archive.'),
    ]),
    pageSection('services', 'Services', 'The words beside the list of services. The list stays in the site’s code.', [
      labelField('The small line above the words.'),
      leadField('The words under the small line.', 'lead', 'Standfirst', 2),
    ]),
    pageSection('results', 'Results', 'The heading and the note above the figures. The figures and the buttons stay in the site’s code.', [
      labelField(),
      headingField(),
      leadField('The note beside the heading.', 'note', 'Note', 2),
    ]),
    pageSection('enquire', 'Enquiry', 'The words beside the enquiry form. The form and the contact details stay in the site’s code.', [
      labelField(),
      headingField(),
      leadField(),
    ]),
    pageSection('archive', 'Archive', 'The title and the standfirst above the grid on the Partners archive page. The grid is the Partners list.', [
      headingField(),
      leadField(),
    ]),
  ],
  preview: {
    prepare: () => ({title: 'Partners page'}),
  },
})
