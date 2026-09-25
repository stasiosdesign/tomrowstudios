import type {ReactNode} from 'react'
import type {ObjectField, SchemaType} from 'sanity'
import {styled} from 'styled-components'

/* How a field's value reads in a collection table: words, never raw objects.
   Each kind of field gets the shortest legible form: a photo is a thumbnail,
   a list is its length, a date is a date. */

export type Column = {
  /** The field's name, or a system field (_createdAt, _updatedAt) */
  name: string
  title: string
  /** The schema type, when the column is a field */
  type?: SchemaType
  /** Sorts numerically or by date rather than as text */
  numeric?: boolean
}

/** The columns a document type offers: its fields in schema order, then when it was created and changed */
export function columnsFor(type: SchemaType | undefined): Column[] {
  const fields = 'fields' in (type ?? {}) ? ((type as {fields: ObjectField[]}).fields ?? []) : []
  const columns = fields
    .filter((field) => !field.type.hidden)
    .map((field) => ({
      name: field.name,
      title: field.type.title ?? field.name,
      type: field.type,
      numeric: field.type.jsonType === 'number' || ['date', 'datetime'].includes(field.type.name),
    }))
  return [
    ...columns,
    {name: '_createdAt', title: 'Created', numeric: true},
    {name: '_updatedAt', title: 'Modified', numeric: true},
  ]
}

const Thumb = styled.img`
  display: block;
  width: 40px;
  height: 28px;
  object-fit: cover;
  border-radius: 2px;
  background: var(--card-skeleton-color-from);
`

const Muted = styled.span`
  color: var(--card-muted-fg-color);
`

const dateFormat = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})

export const formatDate = (value: string, withTime = false): string => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : (withTime ? dateTimeFormat : dateFormat).format(date)
}

/** The asset ID an image or file reference points at, as a CDN address */
export function assetUrl(ref: string, projectId: string, dataset: string, params = ''): string | null {
  const match = /^(image|file)-([a-z0-9]+)-(?:(\d+x\d+)-)?([a-z0-9]+)$/.exec(ref)
  if (!match) return null
  const [, kind, hash, , extension] = match
  return kind === 'image'
    ? `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}.${extension}${params}`
    : `https://cdn.sanity.io/files/${projectId}/${dataset}/${hash}.${extension}`
}

const clip = (text: string, length = 90) => (text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text)

/** The text of a Portable Text value's first block */
function portableTextExcerpt(blocks: unknown[]): string {
  const block = blocks.find((item) => (item as {_type?: string})?._type === 'block') as
    | {children?: {text?: string}[]}
    | undefined
  return block?.children?.map((child) => child.text ?? '').join('') ?? ''
}

/** A plain-text form of a value, for searching and sorting */
export function textOf(value: unknown, column: Column): string {
  if (value == null || value === '') return ''
  const typeName = column.type?.name
  if (column.name === '_createdAt' || column.name === '_updatedAt') return formatDate(String(value), true)
  if (typeName === 'date') return formatDate(String(value))
  if (typeName === 'datetime') return formatDate(String(value), true)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString('en-GB')
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) return value.join(', ')
    if (value.some((item) => (item as {_type?: string})?._type === 'block')) return portableTextExcerpt(value)
    return `${value.length} ${value.length === 1 ? 'item' : 'items'}`
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeName === 'slug' && typeof record.current === 'string') return `/${record.current}`
    if (typeof record.alt === 'string') return record.alt
    for (const key of ['title', 'name', 'label', 'heading', 'caption']) {
      if (typeof record[key] === 'string') return record[key] as string
    }
    if (typeof record._ref === 'string') return 'Linked'
    if (record.asset) return typeName === 'file' ? 'File' : 'Image'
    return 'Set'
  }
  return String(value)
}

/** The value as the table shows it */
export function renderValue(value: unknown, column: Column, projectId: string, dataset: string): ReactNode {
  if (value == null || value === '') return <Muted>—</Muted>
  const record = typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  const assetRef = (record?.asset as {_ref?: string} | undefined)?._ref
  if (column.type?.name === 'image' && assetRef) {
    const src = assetUrl(assetRef, projectId, dataset, '?w=80&h=56&fit=crop&auto=format')
    return src ? <Thumb src={src} alt={typeof record?.alt === 'string' ? record.alt : ''} loading="lazy" /> : 'Image'
  }
  if (column.type?.name === 'file' && assetRef) return 'PDF uploaded'
  if (typeof value === 'boolean') return value ? 'Yes' : <Muted>No</Muted>
  if (typeof value === 'number') return value.toLocaleString('en-GB')
  const text = textOf(value, column)
  if (Array.isArray(value) || (record && column.type?.name !== 'slug')) return <Muted>{clip(text)}</Muted>
  return clip(text)
}
