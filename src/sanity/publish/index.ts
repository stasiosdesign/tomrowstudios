/* POST /api/publish: the live site's publishing, done on the server.

   Staging and development only (astro.config.mjs injects the route where
   the site renders on request; production, being static, has nothing of
   the kind). The Studio's publishing control calls it (studio/lib/publish.ts)
   to put one document on the live site, or take it off:

     { action: "publish",   id, rev? }   publish the document's current saved
                                         version (its draft, or its published
                                         document) in the staging dataset,
                                         then copy it to the production
                                         dataset: staging is never behind
     { action: "unpublish", id }         delete it from the production dataset

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
   live site may hold other asset IDs. Unpublishing refuses while something
   live still refers to the document. */
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

type Action = 'publish' | 'unpublish';
type Body = { action?: Action; id?: string; rev?: string };
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
    if (body.action !== 'publish' && body.action !== 'unpublish') throw new PublishError(400, 'The action must be "publish" or "unpublish".');

    const staging = createClient({ projectId, dataset: STAGING, apiVersion: API_VERSION, token: SANITY_API_WRITE_TOKEN, useCdn: false, perspective: 'raw' });
    const production = staging.withConfig({ dataset: PRODUCTION });

    const result = body.action === 'publish' ? await publish(staging, production, body.id, body.rev) : await unpublish(production, body.id);
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

async function publish(staging: SanityClient, production: SanityClient, id: string, rev?: string) {
  // The current saved version: the draft when there is one, else the published document
  const [draft, published] = await Promise.all([staging.getDocument(`drafts.${id}`), staging.getDocument(id)]);
  const current = draft ?? published;
  if (!current) throw new PublishError(404, 'There is nothing saved to publish yet.');

  // Exactly the revision the editor was looking at, from the document's history
  let source = current;
  if (rev && rev !== current._rev) {
    const history = (await staging.request({ url: `/data/history/${STAGING}/documents/${current._id}?revision=${encodeURIComponent(rev)}` }).catch(() => null)) as { documents?: SanityDocument[] } | null;
    const revision = history?.documents?.[0];
    if (!revision) throw new PublishError(409, 'The version you were looking at can no longer be found. Reload and publish again.');
    source = revision;
  }

  const references = documentReferences(source);
  const missing = await missingLive(staging, production, references);
  if (missing.length > 0) {
    throw new PublishError(422, 'This links to content that is not on the live site yet. Publish that live first.', { missing });
  }
  const renamed = await carryAssets(staging, production, assetReferences(source));

  const { _rev: _r, _updatedAt: _u, _system: _s, ...content } = source as SanityDocument & { _system?: unknown };

  // Staging gets the same version first, so it is never behind the live site.
  // The draft goes too when it is the version published; newer edits stay.
  const toStaging = staging.transaction().createOrReplace({ ...content, _id: id } as SanityDocument);
  if (draft && draft._rev === source._rev) toStaging.delete(draft._id);
  await toStaging.commit();

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

async function unpublish(production: SanityClient, id: string) {
  const referrers: { _id: string; _type: string; title?: string }[] = await production.fetch(`*[references($id)]{_id, _type, "title": coalesce(title, name, _id)}`, { id });
  if (referrers.length > 0) {
    throw new PublishError(409, 'Something on the live site still links to this. Unpublish or change that first.', { referrers });
  }
  const existed = !!(await production.getDocument(id));
  await production.transaction().delete(id).delete(logId(id)).commit();
  return { existed };
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

/** Referenced documents that are not published on the live site */
async function missingLive(staging: SanityClient, production: SanityClient, ids: string[]): Promise<Missing[]> {
  if (ids.length === 0) return [];
  const live: string[] = await production.fetch(`*[_id in $ids]._id`, { ids });
  const missingIds = ids.filter((id) => !live.includes(id));
  if (missingIds.length === 0) return [];
  const named: Missing[] = await staging.fetch(`*[_id in $ids]{"id": _id, "type": _type, "title": coalesce(title, name, _id)}`, { ids: missingIds });
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
