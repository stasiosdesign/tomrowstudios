import type {SanityClient, SanityDocument} from 'sanity'
import {STAGING_ORIGIN} from './site'

/* Publishing, as the Studio sees it (see the README, "Content").

   Two datasets: `staging`, which the Studio edits, and `production`, which
   only the live site reads.

   Every action goes through the site's server route, /api/publish, which
   checks who is asking with Sanity and writes with its own token; the
   browser never holds one that can write to production.

   - Publish live           the current saved version (the draft, or else the
                            published document) is published in staging and
                            copied into the production dataset: staging never
                            falls behind the live site.
   - Publish staging only   the same, in staging only; live is not changed.
   - Unpublish              off both sites; the Studio keeps it as a draft.
   - Delete                 gone everywhere.

   The status of a document (publishStatus) is read straight from the
   datasets. */

export const STAGING_DATASET = 'staging'
export const PRODUCTION_DATASET = 'production'

/** The Vercel protection-bypass secret the Visual editor also uses, kept in the dataset by its tool */
const BYPASS_SECRET_ID = 'sanity-preview-url-secret.vercel-protection-bypass'

/** The note /api/publish keeps beside each live document: which content went live */
export type PublishLog = {_id: string; document: string; sourceId: string; sourceRev: string; contentKey: string; publishedAt: string}

export const logId = (id: string): string => `publish-log.${id}`

/** Whether the live site has the editor's version: its note carries the same content */
export const liveHas = (log: PublishLog | null | undefined, doc: SanityDocument | null | undefined): boolean =>
  !!log && !!doc && log.contentKey === contentKey(doc)

export class PublishError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: {missing?: {id: string; type?: string; title?: string}[]; referrers?: {_id: string; _type: string; title?: string}[]},
  ) {
    super(message)
  }
}

async function bypassSecret(client: SanityClient): Promise<string | null> {
  try {
    return (await client.fetch<string | null>(`*[_id == $id][0].secret`, {id: BYPASS_SECRET_ID})) ?? null
  } catch {
    return null
  }
}

async function call(client: SanityClient, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!STAGING_ORIGIN) throw new PublishError('The staging site’s address is not set (SANITY_STUDIO_PREVIEW_ORIGIN).', 0)
  const token = client.config().token
  if (!token) throw new PublishError('No Studio session token is available to identify you. Sign out and in again.', 0)
  const url = new URL('/api/publish', STAGING_ORIGIN)
  const secret = await bypassSecret(client)
  if (secret) url.searchParams.set('x-vercel-protection-bypass', secret)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
      body: JSON.stringify(body),
    })
  } catch {
    throw new PublishError('The staging site could not be reached. Check that it is deployed and that the Vercel bypass secret is set.', 0)
  }
  const result = (await response.json().catch(() => ({}))) as {ok?: boolean; error?: string; details?: PublishError['details']} & Record<string, unknown>
  if (!response.ok || !result.ok) throw new PublishError(result.error ?? `The site answered ${response.status}.`, response.status, result.details)
  return result
}

/**
 * Puts the document's current saved version on staging and the live site. `rev` pins the exact
 * revision. With `site` (the static pages' IDs, the open one among them), the whole static site
 * is published instead: every listed page at its latest saved version.
 */
export async function publishLive(client: SanityClient, id: string, rev?: string, site?: string[]): Promise<void> {
  await call(client, {action: 'publish', id, rev, site})
}

/** Puts the document's current saved version (or with `site`, every static page's) on staging only; the live site is not changed */
export async function publishStaging(client: SanityClient, id: string, rev?: string, site?: string[]): Promise<void> {
  await call(client, {action: 'stage', id, rev, site})
}

/** Takes the document off both sites; the Studio keeps its content as a draft */
export async function unpublish(client: SanityClient, id: string): Promise<void> {
  await call(client, {action: 'unpublish', id})
}

/** Deletes the document everywhere: both sites and the Studio */
export async function deleteDocument(client: SanityClient, id: string): Promise<void> {
  await call(client, {action: 'delete', id})
}

/* The status of an item: where its latest saved version (the draft, or else
   the published document) is published. One function, used by every place
   that shows it (the collection table, the publishing control).

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

/** The note the route leaves in staging when it unpublishes a document */
export type UnpublishLog = {_id: string; document: string; state: 'unpublished'; contentKey: string; unpublishedAt: string}

export function publishStatus(state: {
  draft?: SanityDocument | null
  published?: SanityDocument | null
  live?: SanityDocument | null
  liveLog?: PublishLog | null
  stagingLog?: UnpublishLog | null
}): PublishStatus | null {
  const {draft, published, live, liveLog, stagingLog} = state
  const current = draft ?? published
  if (!current) return null
  const onStaging = !!published && sameContent(published, current)
  const onLive = !!live && (liveHas(liveLog, current) || sameContent(live, current))
  if (onStaging) return onLive ? 'live' : 'staging'
  if (!published && !live && stagingLog?.state === 'unpublished' && stagingLog.contentKey === contentKey(current)) return 'unpublished'
  return 'draft'
}

/* What is compared to say whether a site has the version in the editor: the
   content, without the system fields that differ by nature. Keys are sorted
   so the order they were written in doesn't count. */
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
