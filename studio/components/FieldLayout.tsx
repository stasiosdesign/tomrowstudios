import type {FieldProps, SchemaType} from 'sanity'

/* Every field in every form (sanity.config.ts, form.components.field). The
   editing forms use the pane's width: on a wide pane their fields sit on a
   two-column grid (studio.css, "Editing forms"). The wide fields (text
   areas, rich text, images, lists, groups of fields) take the whole row; the
   small ones that sit well side by side (a line of text, a number, a slug, a
   link, a date, a switch, a file) share a row with a small neighbour, in the
   schema's order. This only marks the small ones; the grid, and one column
   on a narrow pane, are studio.css's. */
/** The widest an editing form's fields run (a CMS item's form, an open page section) */
export const FORM_WIDTH = 1040

export function FieldLayout(props: FieldProps) {
  if (!isCompact(props.schemaType)) return props.renderDefault(props)
  return <div data-tomrow-field="compact">{props.renderDefault(props)}</div>
}

const COMPACT = new Set(['string', 'slug', 'url', 'email', 'number', 'boolean', 'date', 'datetime', 'file', 'reference'])
const WIDE = new Set(['text', 'array', 'object', 'image', 'block', 'document', 'geopoint'])

function isCompact(type: SchemaType): boolean {
  // A choice laid out as radio buttons needs the row
  if ((type.options as {layout?: string} | undefined)?.layout === 'radio') return false
  for (let current: SchemaType | undefined = type; current; current = current.type) {
    if (WIDE.has(current.name)) return false
    if (COMPACT.has(current.name)) return true
  }
  return false
}
