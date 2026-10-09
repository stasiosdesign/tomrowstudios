import type {SanityDocument} from 'sanity'

/* Where a document stands, read from what the two datasets hold: the rules
   every place that shows a status uses (the collection table, the publishing
   control above each document). The actions that change it are in
   lib/publish.ts. Plain functions with no runtime imports, so status.test.ts
   can run them as they are (npm test). */

/** The note /api/publish keeps beside each live document: which content went live */
export type PublishLog = {_id: string; document: string; sourceId: string; sourceRev: string; contentKey: string; publishedAt: string}

/** The note the route leaves in staging when it unpublishes a document */
export type UnpublishLog = {_id: string; document: string; state: 'unpublished'; contentKey: string; unpublishedAt: string}

export const logId = (id: string): string => `publish-log.${id}`

/* The status of an item: where its latest saved version (the draft, or else
   the published document) is published.

     live         staging and the live site both have the latest version
     staging      staging has it and the live site doesn't (an older version
                  may still be live)
     draft        newer edits that neither site has
     unpublished  taken off both sites, and not edited since: the draft still
                  holds what the route's unpublish note says was taken off */
export type PublishStatus = 'live' | 'staging' | 'draft' | 'unpublished'

export const STATUS_LABEL: Record<PublishStatus, string> = {
  live: 'Live',
  staging: 'Staging',
  draft: 'Changes in draft',
  unpublished: 'Unpublished',
}

export const STATUS_TONE: Record<PublishStatus, 'positive' | 'caution' | 'muted'> = {
  live: 'positive',
  staging: 'caution',
  draft: 'caution',
  unpublished: 'muted',
}

/** Everything publishStatus reads for one document */
export type StatusInput = {
  draft?: SanityDocument | null
  published?: SanityDocument | null
  live?: SanityDocument | null
  liveLog?: PublishLog | null
  stagingLog?: UnpublishLog | null
}

export function publishStatus(state: StatusInput): PublishStatus | null {
  const {draft, published, live, liveLog, stagingLog} = state
  const current = draft ?? published
  if (!current) return null
  const onStaging = !!published && sameContent(published, current)
  const onLive = !!live && (liveHas(liveLog, current) || sameContent(live, current))
  if (onStaging) return onLive ? 'live' : 'staging'
  if (!published && !live && stagingLog?.state === 'unpublished' && stagingLog.contentKey === contentKey(current)) return 'unpublished'
  return 'draft'
}

/* The static pages publish as one site, so they share one status, worked out
   from every page's own: Changes in draft while any page has edits neither
   site has, else Staging while any page's latest version is on staging only,
   else Unpublished when every page is, else Live. Pages with nothing saved
   don't count. */
export function groupStatus(statuses: (PublishStatus | null)[]): PublishStatus | null {
  const known = statuses.filter((status): status is PublishStatus => status !== null)
  if (known.length === 0) return null
  if (known.includes('draft')) return 'draft'
  if (known.includes('staging')) return 'staging'
  if (known.every((status) => status === 'unpublished')) return 'unpublished'
  return 'live'
}

const DRAFT_PREFIX = 'drafts.'
const isNote = (doc: SanityDocument): boolean => doc._type === 'publishLog'

/**
 * What the two datasets returned, sorted into each document's StatusInput by its published ID:
 * from staging its draft, its published document and any unpublish note; from production its
 * live copy and publish note. A note joins only a document that is there.
 */
export function groupById(staging: SanityDocument[], production: SanityDocument[]): Map<string, StatusInput> {
  const groups = new Map<string, StatusInput>()
  const group = (id: string): StatusInput => {
    const existing = groups.get(id)
    if (existing) return existing
    const created: StatusInput = {}
    groups.set(id, created)
    return created
  }
  const notes: {note: SanityDocument; side: 'stagingLog' | 'liveLog'}[] = []
  for (const doc of staging) {
    if (isNote(doc)) notes.push({note: doc, side: 'stagingLog'})
    else if (doc._id.startsWith(DRAFT_PREFIX)) group(doc._id.slice(DRAFT_PREFIX.length)).draft = doc
    else group(doc._id).published = doc
  }
  for (const doc of production) {
    if (isNote(doc)) notes.push({note: doc, side: 'liveLog'})
    else if (!doc._id.startsWith(DRAFT_PREFIX)) group(doc._id).live = doc
  }
  for (const {note, side} of notes) {
    const target = groups.get(String(note.document))
    if (!target) continue
    if (side === 'liveLog') target.liveLog = note as unknown as PublishLog
    else target.stagingLog = note as unknown as UnpublishLog
  }
  return groups
}

/* What is compared to say whether a site has the version in the editor: the
   content, without the system fields that differ by nature. Keys are sorted
   so the order they were written in doesn't count. The site's publishing
   route (src/sanity/publish/index.ts) writes its notes with the same function,
   so the two must agree. */
export function contentKey(doc: SanityDocument | null | undefined): string | null {
  if (!doc) return null
  const {_id: _i, _rev: _r, _updatedAt: _u, _createdAt: _c, _system: _s, ...content} = doc as SanityDocument & {_system?: unknown}
  return JSON.stringify(content, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : value,
  )
}

export const sameContent = (a: SanityDocument | null | undefined, b: SanityDocument | null | undefined): boolean =>
  !!a && !!b && contentKey(a) === contentKey(b)

/** Whether the live site has the editor's version: its note carries the same content */
export const liveHas = (log: PublishLog | null | undefined, doc: SanityDocument | null | undefined): boolean =>
  !!log && !!doc && log.contentKey === contentKey(doc)
