import {createContext, useMemo, useRef} from 'react'
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

   One section open at a time: the sections share a group (below), and one
   opening, by a click or by the Visual editor focusing a field in it, closes
   whichever was open. */
export function PageInput(props: InputProps) {
  const group = useSectionGroup()
  if (props.path.length > 0 || !isPageType(props.schemaType.name)) return props.renderDefault(props)
  return (
    <SectionGroup.Provider value={group}>
      <Sections>{props.renderDefault(props)}</Sections>
    </SectionGroup.Provider>
  )
}

/** The page's open sections: each registers its close while open */
export type SectionGroupValue = {
  /** A section has opened: close the others, then keep this one's close */
  open: (id: string, close: () => void) => () => void
}

export const SectionGroup = createContext<SectionGroupValue | null>(null)

function useSectionGroup(): SectionGroupValue {
  const openSections = useRef(new Map<string, () => void>())
  return useMemo(
    () => ({
      open(id, close) {
        for (const [other, closeOther] of Array.from(openSections.current)) {
          if (other !== id) closeOther()
        }
        openSections.current.set(id, close)
        return () => {
          if (openSections.current.get(id) === close) openSections.current.delete(id)
        }
      },
    }),
    [],
  )
}

const Sections = styled.div`
  & > [data-ui='Stack'] {
    gap: 0;
  }

  & > [data-ui='Stack'] > [data-tomrow-section]:first-child {
    border-top: 1px solid var(--card-border-color);
  }

  & > [data-ui='Stack'] > :not([data-tomrow-section]) {
    padding-inline: 14px;
  }

  & > [data-ui='Stack'] > :not([data-tomrow-section]):not(:first-child) {
    margin-top: 32px;
  }
`
