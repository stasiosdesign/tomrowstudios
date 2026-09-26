import type {SanityClient, SanityDocument} from 'sanity'
import {STAGING_ORIGIN} from './site'

/* Publishing, as the Studio sees it (see the README, "Content").

   Two datasets: `staging`, which the Studio edits, and `production`, which
   only the live site reads.

   - Publish to Staging   Sanity's own publish, in the staging dataset only:
                          the draft becomes the published document, which the
                          staging site shows to everyone (with no draft, the
                          published document is written again).
   - Publish Live         asks the site's server route, /api/publish, to
                          publish the current saved version (the draft, or
                          else the published document) in staging and copy it
                          into the production dataset: staging never falls
                          behind the live site.
                          The route checks who is asking with Sanity and
                          writes with its own token; the browser never holds
                          one that can write to production.
   - Unpublish from …     Sanity's unpublish in staging; the route's delete
                          in production.

   The functions here only talk to the route; the status of a document on
   each site is read straight from the datasets (useLiveStatus). */

export const STAGING_DATASET = 'staging'
export const PRODUCTION_DATASET = 'production'

/** The Vercel protection-bypass secret the Visual editor also uses, kept in the dataset by its tool */
const BYPASS_SECRET_ID = 'sanity-preview-url-secret.vercel-protection-bypass'

export type PublishResult = {rev: string; sourceRev: string; sourceId: string}

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

/** Puts the document's current saved version on the live site. `rev` pins the exact revision. */
export async function publishLive(client: SanityClient, id: string, rev?: string): Promise<PublishResult> {
  const result = await call(client, {action: 'publish', id, rev})
  return {rev: String(result.rev), sourceRev: String(result.sourceRev), sourceId: String(result.sourceId)}
}

/** Takes the document off the live site; the Studio keeps it */
export async function unpublishLive(client: SanityClient, id: string): Promise<void> {
  await call(client, {action: 'unpublish', id})
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
