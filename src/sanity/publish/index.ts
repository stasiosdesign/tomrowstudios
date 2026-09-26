/* POST /api/publish: the live site's publishing, done on the server.

   Staging and development only (astro.config.mjs injects the route where
   the site renders on request; production, being static, has nothing of
   the kind). The Studio's publishing controls call it (studio/lib/publish.ts),
   one document at a time, for every publishing action:

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
                                         before any is written
     { action: "unpublish", id }         take it off both sites: delete it
                                         from production, and in staging
                                         keep its content as a draft only
     { action: "delete",    id }         delete it everywhere, draft included

   Unpublishing leaves a note in the staging dataset, publish-log.<id>, with
   the content that was taken off: the Studio shows the item as Unpublished
   (not as Changes in draft) while its draft still holds that content.

   The caller sends the Sanity session token the Studio holds. The route
   checks that token against the project (who is this, and what role), and
   only then writes with its own token, SANITY_API_WRITE_TOKEN, which never
   leaves the server. A publish takes exactly the revision the editor was
   looking at (rev, fetched from the document's history), so typing while it
   runs cannot change what goes live; it refuses to publish a document that
   refers to something not yet live, and carries the images and files the
   document uses over to the production dataset (an asset that comes back
   under another ID is re-pointed). Each publish leaves a note beside the
   document, publish-log.<id>, saying which revision and content went live:
   the Studio compares the editor's version with that, since the copy on the
   live site may hold other asset IDs. Unpublishing and deleting refuse while
   something else still refers to the document, and every check runs before
   the first write, so a refusal changes nothing. */
import type { APIRoute } from 'astro';
import { createClient, type SanityClient, type SanityDocument } from '@sanity/client';
import { SANITY_API_WRITE_TOKEN } from 'astro:env/server';
import { projectId } from '../client';

const API_VERSION = '2025-02-19';
const STAGING = 'staging';
const PRODUCTION = 'production';

/** Roles that may publish live: the project's writing roles */
const PUBLISHING_ROLES = new Set(['administrator', 'editor', 'developer']);

/** The Studios that may call this route */
const ALLOWED_ORIGINS = new Set(['https://tomrowstudios.sanity.studio', 'http://localhost:3333']);

const ACTIONS = ['publish', 'stage', 'unpublish', 'delete'] as const;
type Action = (typeof ACTIONS)[number];
type Body = { action?: Action; id?: string; rev?: string; site?: unknown };
type Missing = { id: string; type?: string; title?: string };

class PublishError extends Error {
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
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
    : {}),
  'Cache-Control': 'no-store',
  Vary: 'Origin',
});

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) } });

export const OPTIONS: APIRoute = ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  try {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) throw new PublishError(403, 'This route only serves the Studio.');
    if (!SANITY_API_WRITE_TOKEN) {
      throw new PublishError(503, 'Live publishing is not set up on this deployment: it needs SANITY_API_WRITE_TOKEN (see the README, "Environment variables").');
    }
    const user = await authenticate(request.headers.get('authorization'));
    const body = (await request.json().catch(() => ({}))) as Body;
    if (!body.id || typeof body.id !== 'string' || body.id.startsWith('drafts.')) throw new PublishError(400, 'A document ID is needed.');
    if (!body.action || !ACTIONS.includes(body.action)) throw new PublishError(400, `The action must be one of: ${ACTIONS.join(', ')}.`);

    const staging = createClient({ projectId, dataset: STAGING, apiVersion: API_VERSION, token: SANITY_API_WRITE_TOKEN, useCdn: false, perspective: 'raw' });
    const production = staging.withConfig({ dataset: PRODUCTION });

    const result =
      (body.action === 'publish' || body.action === 'stage') && body.site !== undefined
        ? await publishSite(staging, production, siteIds(body.site, body.id), body.id, body.rev, body.action === 'publish')
        : body.action === 'publish' || body.action === 'stage'
        ? await publish(staging, production, body.id, body.rev, body.action === 'publish')
        : await takeDown(staging, production, body.id, body.action === 'delete');
    return json({ ok: true, by: user.id, ...result }, 200, origin);
  } catch (error) {
    if (error instanceof PublishError) return json({ ok: false, error: error.message, details: error.details }, error.status, origin);
    console.error('[publish]', error);
    return json({ ok: false, error: 'Publishing failed on the server. Try again; if it keeps failing, check the deployment logs.' }, 500, origin);
  }
};

/** Who is calling, checked with Sanity itself: the token must belong to a member with a writing role */
async function authenticate(header: string | null): Promise<{ id: string; role: string }> {
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new PublishError(401, 'Sign in to the Studio again: no session token was sent.');
  const response = await fetch(`https://${projectId}.api.sanity.io/v${API_VERSION}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new PublishError(401, 'Your Studio session is not valid. Sign in again.');
  const me = (await response.json()) as { id?: string; role?: string; roles?: { name: string }[] };
  const roles = new Set([me.role, ...(me.roles ?? []).map((role) => role.name)].filter((role): role is string => !!role));
  if (!me.id || ![...roles].some((role) => PUBLISHING_ROLES.has(role))) {
    throw new PublishError(403, 'Your role in the Sanity project does not allow publishing. Ask an administrator.');
  }
  return { id: me.id, role: [...roles].join(', ') };
}

type Prepared = { id: string; draft: SanityDocument | null; source: SanityDocument };

/**
 * Everything a publish checks before it writes: the version to publish (the
 * draft, or else the published document; `rev` pins the one the editor was
 * looking at) and that everything it links to is published where it is
 * going. Returns null when there is nothing saved and `optional` is set.
 */
async function prepare(staging: SanityClient, production: SanityClient, id: string, rev: string | undefined, live: boolean, optional = false): Promise<Prepared | null> {
  const [draft, published] = await Promise.all([staging.getDocument(`drafts.${id}`), staging.getDocument(id)]);
  const current = draft ?? published;
  if (!current) {
    if (optional) return null;
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
  const missingStaging = await missingIn(staging, staging, references);
  if (missingStaging.length > 0) {
    throw new PublishError(422, 'This links to content that is not published on staging yet. Publish that first.', { missing: missingStaging });
  }
  const missing = live ? await missingIn(staging, production, references) : [];
  if (missing.length > 0) {
    throw new PublishError(422, 'This links to content that is not on the live site yet. Publish that live first.', { missing });
  }
  return { id, draft: draft ?? null, source };
}

/** Writes a prepared version to staging, and with `live` to the live site too */
async function write(staging: SanityClient, production: SanityClient, { id, draft, source }: Prepared, live: boolean) {
  const renamed = live ? await carryAssets(staging, production, assetReferences(source)) : new Map<string, string>();
  const { _rev: _r, _updatedAt: _u, _system: _s, ...content } = source as SanityDocument & { _system?: unknown };

  // Staging gets the version first, so it is never behind the live site. The
  // draft goes too when it is the version published (newer edits stay), and
  // so does any note of an earlier unpublish.
  const toStaging = staging
    .transaction()
    .createOrReplace({ ...content, _id: id } as SanityDocument)
    .delete(logId(id));
  if (draft && draft._rev === source._rev) toStaging.delete(draft._id);
  const staged = await toStaging.commit({ returnDocuments: true });
  if (!live) return { rev: staged[0]?._rev, sourceRev: source._rev, sourceId: source._id };

  const written = await production
    .transaction()
    .createOrReplace(remapRefs({ ...content, _id: id }, renamed) as SanityDocument)
    .createOrReplace({
      _id: logId(id),
      _type: 'publishLog',
      document: id,
      sourceId: source._id,
      sourceRev: source._rev,
      contentKey: contentKey(source),
      publishedAt: new Date().toISOString(),
    })
    .commit({ returnDocuments: true });
  return { rev: written[0]?._rev, sourceRev: source._rev, sourceId: source._id };
}

/** Publishes the version in the editor to staging, and with `live` to the live site too */
async function publish(staging: SanityClient, production: SanityClient, id: string, rev: string | undefined, live: boolean) {
  const prepared = await prepare(staging, production, id, rev, live);
  return write(staging, production, prepared as Prepared, live);
}

/**
 * Publishes the static site: every page in `site` (each a singleton whose ID
 * is its type) at its latest saved version, the one open in the editor pinned
 * by `rev`. Every page is checked before any is written, so a refusal names
 * the page and changes nothing. Pages with nothing saved are skipped. CMS
 * items are never touched: only the listed page IDs are.
 */
async function publishSite(staging: SanityClient, production: SanityClient, site: string[], openId: string, rev: string | undefined, live: boolean) {
  const prepared: Prepared[] = [];
  for (const id of site) {
    try {
      const page = await prepare(staging, production, id, id === openId ? rev : undefined, live, true);
      if (page) prepared.push(page);
    } catch (error) {
      if (error instanceof PublishError) throw new PublishError(error.status, `${pageName(id)}: ${error.message}`, error.details);
      throw error;
    }
  }
  const pages: string[] = [];
  for (const page of prepared) {
    await write(staging, production, page, live);
    pages.push(page.id);
  }
  return { pages };
}

const pageName = (id: string) => id.replace(/Page$/, '').replace(/^./, (c) => c.toUpperCase()) + ' page';

/** The static pages a site-wide publish may touch: singleton documents named <name>Page, the open one among them */
function siteIds(site: unknown, openId: string): string[] {
  const isPageId = (id: unknown): id is string => typeof id === 'string' && /^[a-z]+Page$/.test(id);
  if (!Array.isArray(site) || !site.every(isPageId) || !site.includes(openId)) throw new PublishError(400, 'A site-wide publish needs the list of static pages, including the open one.');
  return [...new Set(site)];
}

/** The note kept beside each live document; a dotted ID, so it is private to the Studio */
const logId = (id: string) => `publish-log.${id}`;

/* What the two sides are compared on: the content, without the system fields
   that differ by nature, keys sorted. The same function as the Studio's
   (studio/lib/publish.ts), so the two agree. */
function contentKey(doc: SanityDocument): string {
  const { _id: _i, _rev: _r, _updatedAt: _u, _createdAt: _c, _system: _s, ...content } = doc as SanityDocument & { _system?: unknown };
  return JSON.stringify(content, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : value,
  );
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

/**
 * Unpublish (both sites; staging keeps the content as a draft) or delete
 * (everywhere). Both check first that nothing else links to the document, on
 * either site, so a refusal changes nothing; the live site goes first, so a
 * failure part-way leaves it off the live site at least.
 */
async function takeDown(staging: SanityClient, production: SanityClient, id: string, remove: boolean) {
  const referrersQuery = `*[references($id) && !(_id in [$id, $draftId])]{_id, _type, "title": coalesce(title, name, _id)}`;
  const params = { id, draftId: `drafts.${id}` };
  const [live, onStaging]: Referrer[][] = await Promise.all([production.fetch(referrersQuery, params), staging.fetch(referrersQuery, params)]);
  if (live.length > 0) {
    throw new PublishError(409, 'Something on the live site still links to this. Unpublish or change that first.', { referrers: live });
  }
  if (onStaging.length > 0) {
    throw new PublishError(409, 'Something in the Studio still links to this. Remove that link first.', {
      referrers: onStaging.map((item) => ({ ...item, _id: item._id.replace(/^drafts\./, '') })),
    });
  }

  await production.transaction().delete(id).delete(logId(id)).commit();

  const [draft, published] = await Promise.all([staging.getDocument(`drafts.${id}`), staging.getDocument(id)]);
  const toStaging = staging.transaction().delete(id);
  if (remove) {
    toStaging.delete(`drafts.${id}`).delete(logId(id));
  } else {
    // Sanity's own unpublish: the content stays as the draft, with a note of
    // what was taken off, so the Studio can tell Unpublished from new edits
    const kept = draft ?? published;
    if (!draft && published) {
      const { _rev: _r, _updatedAt: _u, ...content } = published;
      toStaging.create({ ...content, _id: `drafts.${id}` } as SanityDocument);
    }
    await toStaging.commit();
    // The note names the draft revision left behind: the site's queries hide
    // the item while its draft is still that revision (src/sanity/queries.ts)
    const left = kept ? await staging.getDocument(`drafts.${id}`) : null;
    if (kept && left) {
      await staging.createOrReplace({
        _id: logId(id),
        _type: 'publishLog',
        document: id,
        state: 'unpublished',
        contentKey: contentKey(kept),
        draftRev: left._rev,
        unpublishedAt: new Date().toISOString(),
      });
    }
    return { existed: !!kept };
  }
  await toStaging.commit();
  return { existed: !!(draft ?? published) };
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
 * The images and files the document uses, uploaded to the live dataset if it lacks them. Assets
 * are content-addressed, but a stored original can differ from the upload (metadata stripped),
 * so an asset that comes back under another ID is returned for re-pointing.
 */
async function carryAssets(staging: SanityClient, production: SanityClient, ids: string[]): Promise<Map<string, string>> {
  const renamed = new Map<string, string>();
  if (ids.length === 0) return renamed;
  const present: string[] = await production.fetch(`*[_id in $ids]._id`, { ids });
  for (const id of ids.filter((asset) => !present.includes(asset))) {
    const asset = (await staging.getDocument(id)) as (SanityDocument & { url?: string; originalFilename?: string; mimeType?: string }) | undefined;
    if (!asset?.url) throw new PublishError(422, `An image or file this uses is missing in the Studio (${id}).`);
    const file = await fetch(asset.url);
    if (!file.ok) throw new PublishError(502, `An image or file could not be read from Sanity (${id}).`);
    const uploaded = await production.assets.upload(id.startsWith('image-') ? 'image' : 'file', Buffer.from(await file.arrayBuffer()), {
      filename: asset.originalFilename,
      contentType: asset.mimeType,
    });
    if (uploaded._id !== id) renamed.set(id, uploaded._id);
  }
  return renamed;
}
