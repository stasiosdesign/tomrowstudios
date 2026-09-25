/* Visual editing: the Studio's Presentation tool shows the site with
   click-to-edit outlines on the content that comes from Sanity.

   It is on only where SANITY_VISUAL_EDITING is true: `npm run dev` with
   .env.development.local, or a preview deployment. The production build never
   turns it on, so the public site carries none of it. Inside the Studio, the
   draft-mode routes (src/sanity/draft-mode/) set a cookie; with that cookie a
   page reads unpublished drafts with SANITY_API_READ_TOKEN. */
import type { AstroCookies } from 'astro';
import { createDataAttribute } from '@sanity/visual-editing-standalone';
import { sanityClient } from './client';

export const visualEditing = import.meta.env.SANITY_VISUAL_EDITING === 'true';

const token: string | undefined = import.meta.env.SANITY_API_READ_TOKEN;
// The Studio the outlines belong to: the hosted one, or your local one under
// `npm run dev`; SANITY_STUDIO_URL overrides it
const studioUrl: string =
  import.meta.env.SANITY_STUDIO_URL ||
  (import.meta.env.DEV ? 'http://localhost:3333' : 'https://tomrowstudios.sanity.studio');

export const DRAFT_MODE_COOKIE = 'sanity-draft-mode';
export const PERSPECTIVE_COOKIE = 'sanity-preview-perspective';

/** Whether this request is the Presentation tool's, in draft mode. */
export function isDraftMode(cookies: AstroCookies) {
  return visualEditing && !!token && cookies.get(DRAFT_MODE_COOKIE)?.value === '1';
}

/** The client for this request: drafts in draft mode (unless the Studio has
    switched to Published), otherwise the site's published-only client. */
export function clientFor(cookies: AstroCookies) {
  if (!isDraftMode(cookies)) return sanityClient;
  const published = cookies.get(PERSPECTIVE_COOKIE)?.value === 'published';
  return sanityClient.withConfig({ token, perspective: published ? 'published' : 'drafts' });
}

type Path = Parameters<typeof createDataAttribute>[0]['path'];

/** The data-sanity attribute that makes an element editable in the
    Presentation tool; nothing at all outside visual editing. */
export function editable(id: string, type: string, path: Path) {
  if (!visualEditing) return {};
  return { 'data-sanity': createDataAttribute({ baseUrl: studioUrl, id, type, path }).toString() };
}
