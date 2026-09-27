import {ImageIcon} from '@sanity/icons/Image'
import {createImageUrlBuilder, type SanityImageSource} from '@sanity/image-url'
import {useState, type ReactNode} from 'react'
import type {ObjectField, SchemaType} from 'sanity'
import {css, styled} from 'styled-components'

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

/** Whether a field holds an image: Sanity's image type, or a type built on it (featureImage) */
export function isImageType(type: SchemaType | undefined): boolean {
  for (let current = type; current; current = current.type) {
    if (current.name === 'image') return true
  }
  return false
}

/* An image column's thumbnail: a fixed 40 x 28 box, so nothing moves as it
   loads, holding the image cropped to fill it (the editor's crop and hotspot
   respected), asked for at twice that size for sharp screens, in the
   browser's best format and a low quality, and only when its row scrolls
   into view. With no image, or one that fails to load, a quiet placeholder. */
const THUMB = {width: 40, height: 28}

const builders = new Map<string, ReturnType<typeof createImageUrlBuilder>>()

function thumbnailUrl(image: unknown, projectId: string, dataset: string): string | null {
  const ref = (image as {asset?: {_ref?: unknown}} | null | undefined)?.asset?._ref
  if (typeof ref !== 'string' || !ref.startsWith('image-')) return null
  const key = `${projectId}/${dataset}`
  let builder = builders.get(key)
  if (!builder) {
    builder = createImageUrlBuilder({projectId, dataset})
    builders.set(key, builder)
  }
  try {
    return builder
      .image(image as SanityImageSource)
      .width(THUMB.width * 2)
      .height(THUMB.height * 2)
      .fit('crop')
      .auto('format')
      .quality(60)
      .url()
  } catch {
    return null
  }
}

function Thumbnail({src, alt}: {src: string | null; alt: string}) {
  // The address that failed, so a new image (a new address) is tried afresh
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || failed === src) {
    return (
      <Placeholder role="img" aria-label="No image">
        <ImageIcon />
      </Placeholder>
    )
  }
  return <Thumb src={src} alt={alt} width={THUMB.width} height={THUMB.height} loading="lazy" decoding="async" onError={() => setFailed(src)} />
}

const box = css`
  display: block;
  box-sizing: border-box;
  width: ${THUMB.width}px;
  height: ${THUMB.height}px;
  border-radius: 2px;
  background: var(--tomrow-hover);
`

const Thumb = styled.img`
  ${box}
  object-fit: cover;
`

const Placeholder = styled.span`
  ${box}
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: var(--card-muted-fg-color);
  opacity: 0.6;
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
  const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  if (isImageType(column.type)) return <Thumbnail src={thumbnailUrl(record, projectId, dataset)} alt={typeof record?.alt === 'string' ? record.alt : ''} />
  if (value == null || value === '') return <Muted>—</Muted>
  const assetRef = (record?.asset as {_ref?: string} | undefined)?._ref
  if (column.type?.name === 'file' && assetRef) return 'PDF uploaded'
  if (typeof value === 'boolean') return value ? 'Yes' : <Muted>No</Muted>
  if (typeof value === 'number') return value.toLocaleString('en-GB')
  const text = textOf(value, column)
  if (Array.isArray(value) || (record && column.type?.name !== 'slug')) return <Muted>{clip(text)}</Muted>
  return clip(text)
}
