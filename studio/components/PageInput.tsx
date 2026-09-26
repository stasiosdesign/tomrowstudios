import {type InputProps} from 'sanity'
import {styled} from 'styled-components'
import {isPageType} from '../lib/site'

/* The form of every static page (the page editor), set once in
   sanity.config.ts (form.components.input): its sections as one ruled list,
   row under row like a CMS collection's table, each opening beneath its title
   (SectionField). Fields that are not sections (the Privacy and Terms text)
   keep the form's usual room above them. Every other input is Sanity's own.
   The way into the visual editor is the Studio's own Visual editor tab. */
export function PageInput(props: InputProps) {
  if (props.path.length > 0 || !isPageType(props.schemaType.name)) return props.renderDefault(props)
  return <Sections>{props.renderDefault(props)}</Sections>
}

const Sections = styled.div`
  & > [data-ui='Stack'] {
    gap: 0;
  }

  & > [data-ui='Stack'] > [data-tomrow-section]:first-child {
    border-top: 1px solid var(--card-border-color);
  }

  & > [data-ui='Stack'] > :not([data-tomrow-section]):not(:first-child) {
    margin-top: 32px;
  }
`
