import {type InputProps} from 'sanity'
import {styled} from 'styled-components'
import {isPageType} from '../lib/site'
import {useInVisualEditor} from './PreviewControls'
import {sectionColumns} from './SectionField'

/* The form of every static page (the page editor), set once in
   sanity.config.ts (form.components.input): its sections as one ruled list,
   full width, row under row like a CMS collection's table, each opening
   beneath its title (SectionField). Over the list, its column heads, Section
   and Section Description, on the rows' own columns, as a collection's
   table heads its columns; not in the Visual editor, whose narrow panel
   lists the names alone. The form itself fills the pane (DocumentLayout).
   Fields that are not sections (the Privacy and Terms text) keep the
   table's 14px inset and some room above them. Every other input is
   Sanity's own. The way into the visual editor is the Studio's own Visual
   editor tab.

   Each section opens and closes on its own, however many are open; the
   Visual editor's Expand all / Collapse all acts on them all (Sections.tsx). */
export function PageInput(props: InputProps) {
  const inVisualEditor = useInVisualEditor()
  if (props.path.length > 0 || !isPageType(props.schemaType.name)) return props.renderDefault(props)
  return (
    <Sections>
      {!inVisualEditor && (
        <ColumnHeads aria-hidden>
          <span>Section</span>
          <span className="section-row__description">Section Description</span>
          <span />
          <span />
        </ColumnHeads>
      )}
      {props.renderDefault(props)}
    </Sections>
  )
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

// One grid row, set like a collection table's heads (CollectionPane):
// small, quiet and medium weight, ruled underneath
const ColumnHeads = styled.div`
  ${sectionColumns}
  box-sizing: border-box;
  min-height: var(--tomrow-row-height);
  padding: 0 14px;
  border-bottom: 1px solid var(--card-border-color);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--card-muted-fg-color);
`
