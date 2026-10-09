/* POST /api/publish: the live site's publishing, done on the server.

   Staging and development only (astro.config.mjs injects the route where
   the site renders on request; production, being static, has nothing of
   the kind). The Studio's publishing controls call it (@stasiosdesign/sanity-cms, its publishing client)
   for every publishing action:

     { action: "publish",   id, rev? }   publish the document's current saved
                                         version (its draft, or its published
                                         document) in the staging dataset,
                                         then copy it to the production
                                         dataset: staging is never behind
     { action: "stage",     id, rev? }   publish it in the staging dataset
                                         only; the live site is not changed
     either, with site: [ids]            the static site: every listed page
                                         (singletons, ID = type) at its
                                         latest saved version, the open one
                                         (id) pinned by rev; all checked
                                         before any is written, so a refusal
                                         changes nothing
     either, with ids: [ids]             several CMS items at once (a
                                         collection's Select mode): each is
                                         checked on its own, the ones that
                                         pass are written together, and the
                                         ones that don't are named in `failed`
     { action: "unpublish", id | ids }   take it off both sites: delete it
                                         from production, and in staging
                                         keep its content as a draft only
     { action: "delete",    id | ids }   delete it everywhere, draft included

   However many documents an action takes, each dataset gets one
   transaction: the documents are read and checked in parallel, then written
   to staging in one commit and to production in another. So publishing the
   whole static site costs the same few round trips as publishing one page
   (it used to run page by page, about two seconds a page), and the live site
   is rebuilt once per action, not once per document: every production
   transaction also writes one marker, publish-log.site-build, for the
   Sanity webhook to watch (see the README, "Publishing").

   Progress: a caller that accepts application/x-ndjson gets the answer as a
   stream of lines, one per stage as it completes ({"phase":"staging"} when
   staging has the documents, {"phase":"live"} when production has them),
   ending with the usual result object; the Studio shows those stages as
   they happen. Everything that can refuse (who is asking, what was asked,
   the checks on each document) is done before the stream starts, with its
   own HTTP status; a failure while writing is the last line of the stream,
   and says which stages had completed, so a publish that reached staging
   but not the live site is reported as exactly that. A caller that doesn't
   ask for the stream gets one JSON answer, as before.

   Unpublishing leaves a note in the staging dataset, publish-log.<id>, with
   the content that was taken off: the Studio shows the item as Unpublished
   (not as Changes in draft) while its draft still holds that content.

   The caller sends the Sanity session token the Studio holds. The route
   checks that token against the project (who is this, and what role), and
   only then writes with its own token, SANITY_API_WRITE_TOKEN, which never
   leaves the server (the check runs alongside the reads, but no write and
   no answer about the content comes before it has passed). A publish takes
   exactly the revision the editor was looking at (rev, fetched from the
   document's history), so typing while it runs cannot change what goes
   live, and what is typed stays as the draft (it is deleted only at the
   revision published); it refuses to publish a document that refers to
   something not yet live, and carries the images and files the document
   uses over to the production dataset (an asset that comes back under
   another ID is re-pointed). Each publish leaves a note beside the
   document, publish-log.<id>, saying which revision and content went live:
   the Studio compares the editor's version with that, since the copy on the
   live site may hold other asset IDs. Unpublishing and deleting refuse while
   something else still refers to the document. */
import type { APIRoute } from 'astro';
import { createClient, type SanityClient, type SanityDocument, type Transaction } from '@sanity/client';
import { SANITY_API_WRITE_TOKEN } from 'astro:env/server';
import { projectId } from '../client';
import { contentKey, logId } from './content-key';

const API_VERSION = '2025-02-19';
const STAGING = 'staging';
const PRODUCTION = 'production';

/** Roles that may publish live: the project's writing roles */
const PUBLISHING_ROLES = new Set(['administrator', 'editor', 'developer']);

/** The Studios that may call this route */
const ALLOWED_ORIGINS = new Set(['https://tomrowstudios.sanity.studio', 'http://localhost:3333']);

/** The most documents one request may take: a collection's Select mode, at most */
const MAX_IDS = 200;

/** Images and files copied to the live dataset this many at a time */
const ASSET_CONCURRENCY = 4;

const ACTIONS = ['publish', 'stage', 'unpublish', 'delete'] as const;
type Action = (typeof ACTIONS)[number];
type Body = { action?: Action; id?: string; rev?: string; site?: unknown; ids?: unknown };
type Missing = { id: string; type?: string; title?: string };
type Failed = { id: string; error: string; details?: unknown };
type Phase = 'staging' | 'live';
type Send = (event: { phase: Phase }) => void;

/* The marker every production transaction writes (a dotted ID, private to
   the Studio and the webhook): one document that changes exactly once per
   live action, whatever the action touched. The Sanity webhook that rebuilds
   the site watches it, so a site publish of seven pages queues one build. */
const BUILD_MARKER_ID = 'publish-log.site-build';

class PublishError extends Error {
  /** The document a refusal concerns, when it is one of several (forDocument) */
  id?: string;

  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

const corsHeaders = (origin: string | null) => ({
  ...(origin && ALLOWED_ORIGINS.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'accept, authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
    : {}),
  'Cache-Control': 'no-store',
  Vary: 'Origin',
});

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) } });

/** An error as the caller reads it; unexpected ones are logged and kept vague */
function errorBody(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof PublishError) return { status: error.status, body: { ok: false, error: error.message, details: error.details } };
  console.error('[publish]', error);
  return { status: 500, body: { ok: false, error: 'Publishing failed on the server. Try again; if it keeps failing, check the deployment logs.' } };
}

export const OPTIONS: APIRoute = ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  const started = performance.now();
  const ms = (since: number) => Math.round(performance.now() - since);
  try {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) throw new PublishError(403, 'This route only serves the Studio.');
    if (!SANITY_API_WRITE_TOKEN) {
      throw new PublishError(503, 'Live publishing is not set up on this deployment: it needs SANITY_API_WRITE_TOKEN (see the README, "Environment variables").');
    }
    // Who is asking is checked while the documents are read; nothing is
    // written, and nothing about the content answered, until it has passed
    const auth = authenticate(request.headers.get('authorization'));
    auth.catch(() => undefined); // awaited below; never an unhandled rejection meanwhile

    const body = (await request.json().catch(() => ({}))) as Body;
    if (!isDocumentId(body.id)) throw new PublishError(400, 'A document ID is needed.');
    if (!body.action || !ACTIONS.includes(body.action)) throw new PublishError(400, `The action must be one of: ${ACTIONS.join(', ')}.`);
    const action = body.action;
    const live = action === 'publish';
    const publishing = action === 'publish' || action === 'stage';
    // Which documents, and whether one failing stops them all: the static
    // site publishes as a whole; a selection of CMS items item by item
    const { ids, strict } =
      body.site !== undefined ? { ids: siteIds(body.site, body.id), strict: true } : body.ids !== undefined ? { ids: manyIds(body.ids, body.id), strict: false } : { ids: [body.id], strict: true };
    const openId = body.id;
    const rev = body.rev;

    const staging = createClient({ projectId, dataset: STAGING, apiVersion: API_VERSION, token: SANITY_API_WRITE_TOKEN, useCdn: false, perspective: 'raw' });
    const production = staging.withConfig({ dataset: PRODUCTION });

    // Everything that can refuse, before anything is written. The reads run
    // alongside the identity check; their outcome waits for it.
    const checksStarted = performance.now();
    const checked = publishing
      ? await settle(ids.map((id) => () => prepare(staging, production, id, id === openId ? rev : undefined, live, body.site !== undefined)), strict)
      : await settle(ids.map((id) => () => checkTakeDown(staging, production, id)), strict);
    const user = await auth;
    const timings: Record<string, number> = { checks: ms(checksStarted), prepared: ms(started) };
    if (checked instanceof Error) throw checked;
    const { passed, failed } = checked;

    // The writes, stage by stage; streamed as they complete when asked for
    const work = async (send: Send) => {
      const result = publishing
        ? await writeAll(staging, production, passed as Prepared[], live, user.id, send, timings)
        : await takeDownAll(staging, production, passed as TakeDown[], action === 'delete', user.id, send, timings);
      return { ok: true as const, by: user.id, published: result.done, failed, ms: { ...timings, total: ms(started) } };
    };
    if (!wantsStream(request)) return json(await work(() => undefined), 200, origin);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const line = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
        const phases: Phase[] = [];
        try {
          line(await work((event) => {
            phases.push(event.phase);
            line(event);
          }));
        } catch (error) {
          const { status, body: failure } = errorBody(error);
          line({ ...failure, status, phases });
        }
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no', ...corsHeaders(origin) } });
  } catch (error) {
    const { status, body } = errorBody(error);
    return json(body, status, origin);
  }
};

const wantsStream = (request: Request) => (request.headers.get('accept') ?? '').includes('application/x-ndjson');

/** A published document's ID: never a draft's, never a dotted (private) one */
const isDocumentId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id);

/**
 * Runs the checks together. Strict: the first refusal is the answer and
 * nothing goes further. Lenient: each document's refusal is kept beside it,
 * and the rest go on. An unexpected error always stops everything.
 */
async function settle<T extends { id: string }>(checks: (() => Promise<T | null>)[], strict: boolean): Promise<{ passed: T[]; failed: Failed[] } | PublishError> {
  const outcomes = await Promise.allSettled(checks.map((check) => check()));
  const passed: T[] = [];
  const failed: Failed[] = [];
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') {
      if (outcome.value) passed.push(outcome.value);
      continue;
    }
    const error: unknown = outcome.reason;
    if (!(error instanceof PublishError)) throw error;
    if (strict) return error;
    failed.push({ id: error.id ?? '', error: error.message, details: error.details });
  }
  return { passed, failed };
}

/** Who is calling, checked with Sanity itself: the token must belong to a member with a writing role */
async function authenticate(header: string | null): Promise<{ id: string; role: string }> {
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new PublishError(401, 'Sign in to the Studio again: no session token was sent.');
  const response = await fetch(`https://${projectId}.api.sanity.io/v${API_VERSION}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new PublishError(401, 'Your Studio session is not valid. Sign in again.');
  const me = (await response.json()) as { id?: string; role?: string; roles?: { name: string }[] };
  const roles = new Set([me.role, ...(me.roles ?? []).map((role) => role.name)].filter((role): role is string => !!role));
  if (!me.id || ![...roles].some((role) => PUBLISHING_ROLES.has(role))) {
    throw new PublishError(403, 'Your role in the Sanity project does not allow publishing. Ask an administrator.', { reason: 'permission' });
  }
  return { id: me.id, role: [...roles].join(', ') };
}

function forDocument<T>(id: string, work: () => Promise<T>, name = id): Promise<T> {
  return work().catch((error: unknown) => {
    if (error instanceof PublishError) {
      error.id = id;
      if (name !== id) error.message = `${name}: ${error.message}`;
    }
    throw error;
  });
}

type Prepared = { id: string; draft: SanityDocument | null; source: SanityDocument };

/**
 * Everything a publish checks before it writes: the version to publish (the
 * draft, or else the published document; `rev` pins the one the editor was
 * looking at) and that everything it links to is published where it is
 * going. A static page with nothing saved yet is skipped (null); any other
 * document with nothing saved is refused.
 */
function prepare(staging: SanityClient, production: SanityClient, id: string, rev: string | undefined, live: boolean, page: boolean): Promise<Prepared | null> {
  return forDocument(id, async () => {
    const [draft, published] = await Promise.all([staging.getDocument(`drafts.${id}`), staging.getDocument(id)]);
    const current = draft ?? published;
    if (!current) {
      if (page) return null;
      throw new PublishError(404, 'There is nothing saved to publish yet.');
    }

    // Exactly the revision the editor was looking at, from the document's history
    let source = current;
    if (rev && rev !== current._rev) {
      const history = (await staging.request({ url: `/data/history/${STAGING}/documents/${current._id}?revision=${encodeURIComponent(rev)}` }).catch(() => null)) as { documents?: SanityDocument[] } | null;
      const revision = history?.documents?.[0];
      if (!revision) throw new PublishError(409, 'The version you were looking at can no longer be found. Reload and publish again.');
      source = revision;
    }

    const references = documentReferences(source);
    const [missingStaging, missingLive] = await Promise.all([missingIn(staging, staging, references), live ? missingIn(staging, production, references) : []]);
    if (missingStaging.length > 0) {
      throw new PublishError(422, 'This links to content that is not published on staging yet. Publish that first.', { missing: missingStaging });
    }
    if (missingLive.length > 0) {
      throw new PublishError(422, 'This links to content that is not on the live site yet. Publish that live first.', { missing: missingLive });
    }
    return { id, draft: draft ?? null, source };
  }, page ? pageName(id) : id);
}

/**
 * Writes the prepared versions: all of them to staging in one transaction,
 * and with `live` all of them to production in another, with the images and
 * files they use. Staging gets them first, so it is never behind the live
 * site, and the assets are copied while it does.
 */
async function writeAll(staging: SanityClient, production: SanityClient, prepared: Prepared[], live: boolean, by: string, send: Send, timings: Record<string, number>): Promise<{ done: string[] }> {
  const ids = prepared.map((page) => page.id);
  if (prepared.length === 0) return { done: ids };
  const contentOf = ({ id, source }: Prepared) => {
    const { _rev: _r, _updatedAt: _u, _system: _s, ...content } = source as SanityDocument & { _system?: unknown };
    return { ...content, _id: id } as SanityDocument;
  };

  // The assets for the live site, meanwhile
  const assets = live ? carryAssets(staging, production, [...new Set(prepared.flatMap((page) => assetReferences(page.source)))]) : Promise.resolve(new Map<string, string>());
  assets.catch(() => undefined); // awaited below

  // The draft goes too when it is the version published (newer edits stay),
  // and so does any note of an earlier unpublish. A draft is deleted only at
  // the revision read above: if an editor typed on while this ran, Sanity
  // refuses the commit (409) and it is made again with every draft kept, so
  // those edits stay as drafts instead of being lost (a draft identical to
  // what was published reads as published anyway: the CMS package's status rules).
  const stagingStarted = performance.now();
  const toStaging = (withDrafts: boolean) => {
    const transaction = staging.transaction();
    for (const page of prepared) {
      transaction.createOrReplace(contentOf(page)).delete(logId(page.id));
      if (withDrafts && page.draft && page.draft._rev === page.source._rev) {
        transaction.patch(page.draft._id, { unset: ['_revision_lock_pseudo_field_'], ifRevisionID: page.draft._rev }).delete(page.draft._id);
      }
    }
    return transaction.commit({ returnDocuments: false });
  };
  await toStaging(true).catch((error: unknown) => {
    if ((error as { statusCode?: number }).statusCode === 409) return toStaging(false);
    throw error;
  });
  timings.staging = Math.round(performance.now() - stagingStarted);
  send({ phase: 'staging' });
  if (!live) return { done: ids };

  const liveStarted = performance.now();
  const renamed = await assets;
  const publishedAt = new Date().toISOString();
  const transaction = production.transaction();
  for (const page of prepared) {
    transaction.createOrReplace(remapRefs(contentOf(page), renamed)).createOrReplace({
      _id: logId(page.id),
      _type: 'publishLog',
      document: page.id,
      sourceId: page.source._id,
      sourceRev: page.source._rev,
      contentKey: contentKey(page.source),
      publishedAt,
    });
  }
  await markBuild(transaction, ids, by).commit({ returnDocuments: false });
  timings.live = Math.round(performance.now() - liveStarted);
  send({ phase: 'live' });
  return { done: ids };
}

/** The one document the rebuild webhook watches, written by every production transaction */
const markBuild = (transaction: Transaction, documents: string[], by: string) =>
  transaction.createOrReplace({ _id: BUILD_MARKER_ID, _type: 'publishLog', state: 'build', documents, by, publishedAt: new Date().toISOString() });

const pageName = (id: string) => id.replace(/Page$/, '').replace(/^./, (c) => c.toUpperCase()) + ' page';

/** The static pages a site-wide publish may touch: singleton documents named <name>Page, the open one among them */
function siteIds(site: unknown, openId: string): string[] {
  const isPageId = (id: unknown): id is string => typeof id === 'string' && /^[a-z]+Page$/.test(id);
  if (!Array.isArray(site) || !site.every(isPageId) || !site.includes(openId)) throw new PublishError(400, 'A site-wide publish needs the list of static pages, including the open one.');
  return [...new Set(site)];
}

/** Several documents at once: their IDs, the one named by `id` among them */
function manyIds(ids: unknown, openId: string): string[] {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || !ids.every(isDocumentId) || !ids.includes(openId)) {
    throw new PublishError(400, `A bulk action needs a list of up to ${MAX_IDS} document IDs, including the one named.`);
  }
  return [...new Set(ids as string[])];
}


function remapRefs<T>(value: T, renamed: Map<string, string>): T {
  if (renamed.size === 0) return value;
  if (Array.isArray(value)) return value.map((item) => remapRefs(item, renamed)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = key === '_ref' && typeof child === 'string' && renamed.has(child) ? renamed.get(child) : remapRefs(child, renamed);
    }
    return out as T;
  }
  return value;
}

type Referrer = { _id: string; _type: string; title?: string };
type TakeDown = { id: string; draft: SanityDocument | null; published: SanityDocument | null; live: boolean };

/**
 * What an unpublish or delete checks before it writes: that there is
 * something to take down, and that nothing else links to the document, on
 * either site, so a refusal changes nothing; and what staging holds of it,
 * for the note an unpublish leaves.
 */
function checkTakeDown(staging: SanityClient, production: SanityClient, id: string): Promise<TakeDown> {
  return forDocument(id, async () => {
    const referrersQuery = `*[references($id) && !(_id in [$id, $draftId])]{_id, _type, "title": coalesce(title, name, _id)}`;
    const params = { id, draftId: `drafts.${id}` };
    const [liveReferrers, stagingReferrers, draft, published, live] = await Promise.all([
      production.fetch<Referrer[]>(referrersQuery, params),
      staging.fetch<Referrer[]>(referrersQuery, params),
      staging.getDocument(`drafts.${id}`),
      staging.getDocument(id),
      production.fetch<string | null>(`*[_id == $id][0]._id`, { id }),
    ]);
    if (!draft && !published && !live) throw new PublishError(404, 'There is nothing here to take down.');
    if (liveReferrers.length > 0) {
      throw new PublishError(409, 'Something on the live site still links to this. Unpublish or change that first.', { referrers: liveReferrers });
    }
    if (stagingReferrers.length > 0) {
      throw new PublishError(409, 'Something in the Studio still links to this. Remove that link first.', {
        referrers: stagingReferrers.map((item) => ({ ...item, _id: item._id.replace(/^drafts\./, '') })),
      });
    }
    return { id, draft: draft ?? null, published: published ?? null, live: !!live };
  });
}

/**
 * Unpublish (both sites; staging keeps the content as a draft) or delete
 * (everywhere), for every document that passed its check: the live site goes
 * first, in one transaction (only when any of them is live: a site that
 * loses nothing is not rebuilt), so a failure part-way leaves them off the
 * live site at least; then staging.
 */
async function takeDownAll(staging: SanityClient, production: SanityClient, items: TakeDown[], remove: boolean, by: string, send: Send, timings: Record<string, number>): Promise<{ done: string[] }> {
  const ids = items.map((item) => item.id);
  if (items.length === 0) return { done: ids };

  const liveStarted = performance.now();
  const liveIds = items.filter((item) => item.live).map((item) => item.id);
  if (liveIds.length > 0) {
    const offLive = production.transaction();
    for (const id of liveIds) offLive.delete(id).delete(logId(id));
    await markBuild(offLive, liveIds, by).commit({ returnDocuments: false });
  }
  timings.live = Math.round(performance.now() - liveStarted);
  send({ phase: 'live' });

  const stagingStarted = performance.now();
  const offStaging = staging.transaction();
  for (const item of items) {
    offStaging.delete(item.id);
    if (remove) offStaging.delete(`drafts.${item.id}`).delete(logId(item.id));
    // Sanity's own unpublish: the content stays as the draft (made from the
    // published document where there was none)
    else if (!item.draft && item.published) {
      const { _rev: _r, _updatedAt: _u, ...content } = item.published;
      offStaging.create({ ...content, _id: `drafts.${item.id}` } as SanityDocument);
    }
  }
  const { transactionId } = await offStaging.commit({ returnDocuments: false });

  // The note names the draft revision left behind (a draft this transaction
  // made carries its ID as its revision): the site's queries hide the item
  // while its draft is still that revision (src/sanity/queries.ts), and the
  // Studio tells Unpublished from new edits by the content
  if (!remove) {
    const notes = staging.transaction();
    let any = false;
    for (const item of items) {
      const kept = item.draft ?? item.published;
      if (!kept) continue;
      any = true;
      notes.createOrReplace({
        _id: logId(item.id),
        _type: 'publishLog',
        document: item.id,
        state: 'unpublished',
        contentKey: contentKey(kept),
        draftRev: item.draft ? item.draft._rev : transactionId,
        unpublishedAt: new Date().toISOString(),
      });
    }
    if (any) await notes.commit({ returnDocuments: false });
  }
  timings.staging = Math.round(performance.now() - stagingStarted);
  send({ phase: 'staging' });
  return { done: ids };
}

const isAssetRef = (ref: string) => ref.startsWith('image-') || ref.startsWith('file-');

function collectRefs(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => collectRefs(item, found));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record._ref === 'string') found.add(record._ref);
    Object.values(record).forEach((child) => collectRefs(child, found));
  }
  return found;
}

const documentReferences = (doc: unknown) => [...collectRefs(doc)].filter((ref) => !isAssetRef(ref));
const assetReferences = (doc: unknown) => [...collectRefs(doc)].filter(isAssetRef);

/** Referenced documents that are not published in the target dataset (staging or production), named from staging */
async function missingIn(staging: SanityClient, target: SanityClient, ids: string[]): Promise<Missing[]> {
  if (ids.length === 0) return [];
  const present: string[] = await target.fetch(`*[_id in $ids]._id`, { ids });
  const missingIds = ids.filter((id) => !present.includes(id));
  if (missingIds.length === 0) return [];
  const named: Missing[] = await staging.fetch(`*[_id in $ids || _id in $draftIds]{"id": string::split(_id, "drafts.")[-1], "type": _type, "title": coalesce(title, name, _id)}`, {
    ids: missingIds,
    draftIds: missingIds.map((id) => `drafts.${id}`),
  });
  return missingIds.map((id) => named.find((item) => item.id === id) ?? { id, title: id });
}

/**
 * The images and files the documents use, uploaded to the live dataset if it lacks them (a few at
 * a time). Assets are content-addressed, but a stored original can differ from the upload
 * (metadata stripped), so an asset that comes back under another ID is returned for re-pointing.
 */
async function carryAssets(staging: SanityClient, production: SanityClient, ids: string[]): Promise<Map<string, string>> {
  const renamed = new Map<string, string>();
  if (ids.length === 0) return renamed;
  const present: string[] = await production.fetch(`*[_id in $ids]._id`, { ids });
  const queue = ids.filter((asset) => !present.includes(asset));
  const carry = async (id: string) => {
    const asset = (await staging.getDocument(id)) as (SanityDocument & { url?: string; originalFilename?: string; mimeType?: string }) | undefined;
    if (!asset?.url) throw new PublishError(422, `An image or file this uses is missing in the Studio (${id}).`);
    const file = await fetch(asset.url);
    if (!file.ok) throw new PublishError(502, `An image or file could not be read from Sanity (${id}).`);
    const uploaded = await production.assets.upload(id.startsWith('image-') ? 'image' : 'file', Buffer.from(await file.arrayBuffer()), {
      filename: asset.originalFilename,
      contentType: asset.mimeType,
    });
    if (uploaded._id !== id) renamed.set(id, uploaded._id);
  };
  const workers = Array.from({ length: Math.min(ASSET_CONCURRENCY, queue.length) }, async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) await carry(next);
  });
  await Promise.all(workers);
  return renamed;
}
