import type {SanityClient, SanityDocument} from 'sanity'

/* The live copies: how "Publish live" works.

   One dataset holds three states of every document (see the README,
   "Publishing"):
   - drafts.<id>   the draft: what is being edited
   - <id>          published: what "Publish to staging" releases; staging
                   shows it to everyone
   - live.<id>     the live copy: a copy of the published document taken when
                   "Publish live" is pressed. Production is built from live
                   copies alone, so nothing reaches the public site until it is
                   put there on purpose.

   Everything here is a plain function of a client, so the same code serves
   the publishing bar and the scripts in scripts/. */

export const LIVE_PREFIX = 'live.'
const DRAFTS_PREFIX = 'drafts.'

/** The live copy's ID for any form of a document's ID */
export const liveId = (id: string): string => LIVE_PREFIX + publishedId(id)

/** The published document's ID for any form of a document's ID */
export const publishedId = (id: string): string =>
  id.startsWith(DRAFTS_PREFIX) ? id.slice(DRAFTS_PREFIX.length) : id.startsWith(LIVE_PREFIX) ? id.slice(LIVE_PREFIX.length) : id

export const isLiveId = (id: string): boolean => id.startsWith(LIVE_PREFIX)

/** An asset reference (image-…, file-…) points at an asset document, which live copies share */
const isAssetRef = (ref: string) => ref.startsWith('image-') || ref.startsWith('file-')

/** Every reference to another document (not an asset) anywhere in a value */
export function documentReferences(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) documentReferences(item, found)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record._ref === 'string' && !isAssetRef(record._ref)) found.add(publishedId(record._ref))
    for (const child of Object.values(record)) documentReferences(child, found)
  }
  return found
}

// A live copy's references point at other live copies: production only has those
function toLiveReferences<T>(value: T): T {
  if (Array.isArray(value)) return value.map(toLiveReferences) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = key === '_ref' && typeof child === 'string' && !isAssetRef(child) ? liveId(child) : toLiveReferences(child)
    }
    return out as T
  }
  return value
}

/** A live copy as it is written: Sanity sets _rev and _updatedAt itself */
export type LiveCopy = Omit<SanityDocument, '_rev' | '_updatedAt'> & {_id: string; _type: string}

/** The live copy of a published document: the same content under the live ID */
export function toLiveCopy(published: SanityDocument): LiveCopy {
  const {_rev: _r, _updatedAt: _u, ...rest} = published
  return toLiveReferences({...rest, _id: liveId(published._id)})
}

/* What the two sides are compared on: the content, without the system fields
   that differ by nature (_id, _rev, _updatedAt) and with references read the
   same way. Keys are sorted so the order they were written in doesn't count. */
function stableContent(doc: SanityDocument): string {
  const {_id: _i, _rev: _r, _updatedAt: _u, _createdAt: _c, ...content} = toLiveReferences(doc)
  return JSON.stringify(content, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : value,
  )
}

/** Whether the live copy carries the same content as the published document */
export const sameContent = (published: SanityDocument, live: SanityDocument): boolean =>
  stableContent(published) === stableContent(live)

export type MissingReference = {id: string; type?: string; title?: string}

/**
 * The documents this document refers to that have no live copy yet. Publishing it live with
 * those missing would build production pages with broken references, so the bar refuses until
 * they are live too.
 */
export async function missingLiveReferences(client: SanityClient, doc: SanityDocument): Promise<MissingReference[]> {
  const ids = [...documentReferences(doc)]
  if (ids.length === 0) return []
  const rows: {_id: string; _type?: string; title?: string}[] = await client.fetch(
    `*[_id in $ids]{_id, _type, "title": coalesce(title, name, _id)}`,
    {ids: [...ids, ...ids.map(liveId)]},
  )
  const present = new Set(rows.map((row) => row._id))
  return ids
    .filter((id) => !present.has(liveId(id)))
    .map((id) => {
      const source = rows.find((row) => row._id === id)
      return {id, type: source?._type, title: source?.title ?? id}
    })
}

/** Writes the live copy of a published document (creating or replacing it) */
export async function publishLive(client: SanityClient, published: SanityDocument): Promise<SanityDocument> {
  const copy = toLiveCopy(published)
  try {
    return await client.createOrReplace(copy)
  } catch (error) {
    // Some API versions refuse a client-set _createdAt on replace: then without it
    if (copy._createdAt && /_createdAt/.test(String((error as Error).message))) {
      const {_createdAt: _c, ...withoutCreatedAt} = copy
      return client.createOrReplace(withoutCreatedAt as LiveCopy)
    }
    throw error
  }
}

/** Removes the live copy, if there is one. The published document and the draft are untouched. */
export async function unpublishLive(client: SanityClient, id: string): Promise<void> {
  await client.delete(liveId(id))
}

/** Everything of a type that is published but not live, or live with older content */
export async function pendingLive(client: SanityClient, types: string[]): Promise<{id: string; type: string; title: string; live: boolean}[]> {
  const rows: {published: SanityDocument[]; live: SanityDocument[]} = await client.fetch(
    `{
      "published": *[_type in $types && !(_id in path("drafts.**")) && !(_id in path("live.*"))],
      "live": *[_type in $types && _id in path("live.*")]
    }`,
    {types},
  )
  const liveById = new Map(rows.live.map((doc) => [doc._id, doc]))
  return rows.published
    .map((doc) => {
      const live = liveById.get(liveId(doc._id))
      const title = String((doc as {title?: unknown}).title ?? (doc as {name?: unknown}).name ?? doc._id)
      return {id: doc._id, type: doc._type, title, live: !!live, current: !!live && sameContent(doc, live)}
    })
    .filter((row) => !row.current)
    .map(({current: _c, ...row}) => row)
}
