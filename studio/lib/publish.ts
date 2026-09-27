import type {SanityClient} from 'sanity'
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

   The status of a document is read straight from the datasets
   (lib/status.ts). */

export const STAGING_DATASET = 'staging'
export const PRODUCTION_DATASET = 'production'

/** The API version the publishing control and the collections read with */
export const API_VERSION = '2025-02-19'

/** Readers for both datasets as they are (raw: drafts and notes included), never from the CDN */
export function datasetClients(client: SanityClient): {staging: SanityClient; production: SanityClient} {
  const staging = client.withConfig({dataset: STAGING_DATASET, perspective: 'raw', useCdn: false})
  return {staging, production: staging.withConfig({dataset: PRODUCTION_DATASET})}
}

/** The Vercel protection-bypass secret the Visual editor also uses, kept in the dataset by its tool */
const BYPASS_SECRET_ID = 'sanity-preview-url-secret.vercel-protection-bypass'

/* The project roles that may publish, unpublish and delete: the same set the
   server route checks (src/sanity/publish/index.ts, PUBLISHING_ROLES). The
   Studio checks first, so a Contributor is told plainly instead of the
   action being sent; the route still refuses on its own. */
export const PUBLISHING_ROLES = new Set(['administrator', 'editor', 'developer'])

type PublishErrorDetails = {
  reason?: string
  missing?: {id: string; type?: string; title?: string}[]
  referrers?: {_id: string; _type: string; title?: string}[]
}

export class PublishError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: PublishErrorDetails,
  ) {
    super(message)
  }
}

/** A failed action as the editor reads it: the route's own message, naming what it refers to */
export function failText(error: unknown): string {
  if (error instanceof PublishError) {
    if (error.details?.missing?.length) return `${error.message} Missing: ${error.details.missing.map((item) => item.title ?? item.id).join(', ')}.`
    if (error.details?.referrers?.length) return `${error.message} Linked from: ${error.details.referrers.map((item) => item.title ?? item._id).join(', ')}.`
    return error.message
  }
  const err = error as {statusCode?: number; message?: string} | null | undefined
  if (err?.statusCode === 403) return 'You don’t have permission for that. Ask an administrator of the Sanity project.'
  return err?.message ?? String(error)
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
  const result = (await response.json().catch(() => ({}))) as {ok?: boolean; error?: string; details?: PublishErrorDetails} & Record<string, unknown>
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
