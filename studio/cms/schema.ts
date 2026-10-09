import {defineField, type FieldDefinition} from 'sanity'
import {SectionField} from './components/SectionField'

/* The Page editor's one schema convention: a page document is a list of
   sections, each a folded object (SectionField) holding the few things the
   page's code no longer fixes. The page editor's form (PageInput), its
   Expand all (Sections.tsx) and the Visual editor's scroll to a section
   (PreviewControls, showInPreview) all work on fields made this way. What
   goes in each section is the site's. */

const SECTION = {
  options: {collapsible: true, collapsed: true},
  components: {field: SectionField},
}

/** One section of a page: a folded object with the given fields, all of it required. */
export const pageSection = (name: string, title: string, description: string, fields: FieldDefinition[]) =>
  defineField({
    name,
    title,
    type: 'object',
    description,
    ...SECTION,
    validation: (rule) => rule.required(),
    fields,
  })
