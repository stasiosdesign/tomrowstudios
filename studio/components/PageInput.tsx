import {type InputProps} from 'sanity'
import {styled} from 'styled-components'
import {isPageType} from '../lib/site'

/* The form of every static page (the page editor), set once in
   sanity.config.ts (form.components.input): its sections as one ruled list,
   full width, row under row like a CMS collection's table, each opening
   beneath its title (SectionField). The form itself fills the pane
   (DocumentLayout). Fields that are not sections (the Privacy and Terms text)
   keep the table's 14px inset and some room above them. Every other input is
   Sanity's own. The way into the visual editor is the Studio's own Visual
   editor tab.

   Each section opens and closes on its own, however many are open; the
   header's Expand all / Collapse all acts on them all (Sections.tsx). */
export function PageInput(props: InputProps) {
  if (props.path.length > 0 || !isPageType(props.schemaType.name)) return props.renderDefault(props)
  return <Sections>{props.renderDefault(props)}</Sections>
}

// The form's column of fields: Sanity UI's Stack, which newer releases (the
// hosted Studio updates itself) mark VStack instead
const STACK = `:is([data-ui='Stack'], [data-ui='VStack'])`

const Sections = styled.div`
  & > ${STACK} {
    gap: 0;
  }

  & > ${STACK} > [data-tomrow-section]:first-child {
    border-top: 1px solid var(--card-border-color);
  }

  & > ${STACK} > :not([data-tomrow-section]) {
    padding-inline: 14px;
  }

  & > ${STACK} > :not([data-tomrow-section]):not(:first-child) {
    margin-top: 32px;
  }
`
