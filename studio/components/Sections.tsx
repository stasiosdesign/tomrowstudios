import {DoubleChevronDownIcon} from '@sanity/icons/DoubleChevronDown'
import {DoubleChevronUpIcon} from '@sanity/icons/DoubleChevronUp'
import {Button, Text} from '@sanity/ui'
import {Tooltip} from '@sanity/ui/tooltip'
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {useInVisualEditor} from './PreviewControls'

/* The expandable sections of the open document: its top-level groups that
   fold (a page's sections, a shop item's Header, Details and write-up). Each
   opens and closes on its own, and stays as it is when another one opens;
   the header's Expand all / Collapse all (SectionsToggle) acts on them all.

   DocumentLayout provides this around the document's header and form alike,
   so the control in the header reaches the sections in the form, and only
   this document's. The form's fields register through FieldLayout, on a
   context that never changes, so a section opening re-renders the control
   and nothing else. */

type Section = {collapsed: boolean; expand: () => void; collapse: () => void}
type Register = (id: string, section: Section | null) => void

const RegisterContext = createContext<Register | null>(null)
const SectionsContext = createContext<Map<string, Section>>(new Map())

export function SectionsProvider({children}: {children: ReactNode}) {
  const [sections, setSections] = useState(() => new Map<string, Section>())
  const register = useCallback<Register>((id, section) => {
    setSections((current) => {
      const next = new Map(current)
      if (section) next.set(id, section)
      else next.delete(id)
      return next
    })
  }, [])
  return (
    <RegisterContext.Provider value={register}>
      <SectionsContext.Provider value={sections}>{children}</SectionsContext.Provider>
    </RegisterContext.Provider>
  )
}

/** Keeps a top-level expandable section on the list while it is shown; `id` null for any other field */
export function useSection(id: string | null, collapsed: boolean, onExpand: () => void, onCollapse: () => void): void {
  const register = useContext(RegisterContext)
  // The latest handlers, read when Expand all or Collapse all runs
  const handlers = useRef({onExpand, onCollapse})
  useEffect(() => {
    handlers.current = {onExpand, onCollapse}
  })
  useEffect(() => {
    if (!register || !id) return undefined
    register(id, {collapsed, expand: () => handlers.current.onExpand(), collapse: () => handlers.current.onCollapse()})
    return undefined
  }, [register, id, collapsed])
  useEffect(() => {
    if (!register || !id) return undefined
    return () => register(id, null)
  }, [register, id])
}

/* Expand all while any section is closed, Collapse all once every one is
   open; only where the document has two sections or more. A secondary
   button, filled like the others (theme.ts). In the document's header row
   (sanity.config.ts, document.unstable_languageFilter), beside its actions;
   in the Visual editor's narrow side panel, where that row also holds the
   Edit switch and the views, an icon with the same name as its label and
   tooltip, so Show more stays in view. */
export function SectionsToggle() {
  const sections = useContext(SectionsContext)
  const inVisualEditor = useInVisualEditor()
  const all = useMemo(() => [...sections.values()], [sections])
  if (all.length < 2) return null
  const anyClosed = all.some((section) => section.collapsed)
  const label = anyClosed ? 'Expand all' : 'Collapse all'
  const toggle = () => {
    for (const section of all) {
      if (anyClosed && section.collapsed) section.expand()
      else if (!anyClosed) section.collapse()
    }
  }
  if (!inVisualEditor) {
    return <Button mode="ghost" fontSize={1} padding={2} text={label} onClick={toggle} data-tomrow-sections-toggle />
  }
  return (
    <Tooltip content={<Text size={1}>{label}</Text>} placement="bottom" portal>
      <Button mode="ghost" padding={2} icon={anyClosed ? DoubleChevronDownIcon : DoubleChevronUpIcon} aria-label={label} onClick={toggle} data-tomrow-sections-toggle />
    </Tooltip>
  )
}
