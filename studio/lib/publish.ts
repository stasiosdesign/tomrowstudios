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

   Each action takes one document, the whole static site (`site`) or a
   selection of CMS items (`ids`) in one request: the route reads and checks
   them together and writes each dataset once. The route answers stage by
   stage (a stream of lines: staging done, live done, then the result), and
   `onPhase` is told as each lands, so the publishing control can show where
   an action is. An older route that answers in one piece is read as before.

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

/** The stages of an action the route reports as each completes */
export type Phase = 'staging' | 'live'

type PublishErrorDetails = {
  reason?: string
  missing?: {id: string; type?: string; title?: string}[]
  referrers?: {_id: string; _type: string; title?: string}[]
}

/** One document of several that the route refused, and why */
export type FailedDocument = {id: string; error: string; details?: PublishErrorDetails}

/** What the route answers once an action has run */
export type PublishResult = {
  /** The documents written (for a publish: on staging, and live when asked) */
  published: string[]
  /** Of several, the ones refused by their checks; nothing was written for these */
  failed: FailedDocument[]
  /** How long each part took on the server, in milliseconds */
  ms?: Record<string, number>
}

export class PublishError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: PublishErrorDetails,
    /** The stages that had completed when the action failed: a publish may have reached staging and not the live site */
    public phases: Phase[] = [],
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

/** The same, for one document the route refused among several */
export const failedText = (failed: FailedDocument): string => failText(new PublishError(failed.error, 0, failed.details))

// The bypass secret changes only when someone sets a new one in the Studio's
// Vercel tool: read once, then kept for a while, so an action costs one
// request, not two
let bypass: {secret: string | null; readAt: number} | null = null
const BYPASS_TTL_MS = 10 * 60_000

async function bypassSecret(client: SanityClient): Promise<string | null> {
  if (bypass && Date.now() - bypass.readAt < BYPASS_TTL_MS) return bypass.secret
  try {
    const secret = (await client.fetch<string | null>(`*[_id == $id][0].secret`, {id: BYPASS_SECRET_ID})) ?? null
    bypass = {secret, readAt: Date.now()}
    return secret
  } catch {
    return bypass?.secret ?? null
  }
}

/** Forgets the kept secret (after a refusal from Vercel, so the next action reads it afresh) */
const forgetBypass = () => {
  bypass = null
}

type Answer = {ok?: boolean; error?: string; details?: PublishErrorDetails; status?: number; phases?: Phase[]; phase?: Phase} & Partial<PublishResult>

async function call(client: SanityClient, body: Record<string, unknown>, onPhase?: (phase: Phase) => void): Promise<PublishResult> {
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
      headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/x-ndjson, application/json'},
      body: JSON.stringify(body),
    })
  } catch {
    throw new PublishError('The staging site could not be reached. Check that it is deployed and that the Vercel bypass secret is set.', 0)
  }
  // Vercel's own refusal (the bypass secret is wrong or stale) comes with no answer of the route's
  if (response.status === 401 && !(response.headers.get('content-type') ?? '').includes('json')) {
    forgetBypass()
    throw new PublishError('The staging site refused the request: its Vercel bypass secret may have changed. Set it again in the Studio’s Vercel tool and try again.', 401)
  }
  const streamed = (response.headers.get('content-type') ?? '').includes('application/x-ndjson')
  const answer = streamed ? await readStream(response, onPhase) : ((await response.json().catch(() => ({}))) as Answer)
  if (!response.ok || !answer.ok) {
    throw new PublishError(answer.error ?? `The site answered ${response.status}.`, answer.status ?? response.status, answer.details, answer.phases ?? [])
  }
  // An answer in one piece (an older route): every stage is done at once
  if (!streamed && onPhase) for (const phase of phasesOf(body)) onPhase(phase)
  return {published: answer.published ?? [], failed: answer.failed ?? [], ms: answer.ms}
}

/** The stages an action has, in the order the route runs them */
export function phasesOf(body: {action?: unknown}): Phase[] {
  if (body.action === 'publish') return ['staging', 'live']
  if (body.action === 'stage') return ['staging']
  return ['live', 'staging']
}

/** Reads the route's answer line by line: each stage as it lands, then the result (the last line) */
async function readStream(response: Response, onPhase?: (phase: Phase) => void): Promise<Answer> {
  const reader = response.body?.getReader()
  if (!reader) throw new PublishError('The site’s answer could not be read.', 0)
  const decoder = new TextDecoder()
  let buffer = ''
  let last: Answer | null = null
  const take = (line: string) => {
    if (!line.trim()) return
    const parsed = JSON.parse(line) as Answer
    if (parsed.phase) onPhase?.(parsed.phase)
    else last = parsed
  }
  for (;;) {
    const {done, value} = await reader.read()
    if (done) break
    buffer += decoder.decode(value, {stream: true})
    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      take(buffer.slice(0, newline))
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
    }
  }
  take(buffer + decoder.decode())
  if (!last) throw new PublishError('The connection to the site was lost before it answered. Check the status: the action may still have gone through.', 0)
  return last
}

/** What one request takes: one document (`id`, pinned by `rev`), the static pages (`site`) or several CMS items (`ids`, the first being `id`) */
export type Target = {id: string; rev?: string; site?: string[]; ids?: string[]}

/**
 * Puts the current saved version on staging and the live site: of the document, of every static
 * page (`site`) or of each of several items (`ids`). `rev` pins the exact revision of `id`.
 */
export function publishLive(client: SanityClient, target: Target, onPhase?: (phase: Phase) => void): Promise<PublishResult> {
  return call(client, {action: 'publish', ...target}, onPhase)
}

/** The same, on staging only; the live site is not changed */
export function publishStaging(client: SanityClient, target: Target, onPhase?: (phase: Phase) => void): Promise<PublishResult> {
  return call(client, {action: 'stage', ...target}, onPhase)
}

/** Takes the document (or each of `ids`) off both sites; the Studio keeps its content as a draft */
export function unpublish(client: SanityClient, target: Target, onPhase?: (phase: Phase) => void): Promise<PublishResult> {
  return call(client, {action: 'unpublish', ...target}, onPhase)
}

/** Deletes the document (or each of `ids`) everywhere: both sites and the Studio */
export function deleteDocument(client: SanityClient, target: Target, onPhase?: (phase: Phase) => void): Promise<PublishResult> {
  return call(client, {action: 'delete', ...target}, onPhase)
}
