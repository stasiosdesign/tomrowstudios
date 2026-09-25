/* Draft mode: how staging (and `npm run dev`) shows unpublished Sanity content.

   The Studio's Visual editor switches it on. It opens the site at
   /api/draft-mode/enable (enable.ts) with a secret it has just written into
   the dataset, valid for an hour: Sanity's preview URL secret. The route
   checks that secret with the read token and gives the browser a signed
   cookie; while the cookie is valid, src/middleware.ts renders that browser's
   pages with drafts. Everyone else, and every page of production, gets
   published content only.

   The token is server-side only: read at request time (astro:env secret),
   never put in a page or a browser bundle, and on Vercel set for the staging
   branch alone. Production is built without the routes that use it
   (astro.config.mjs). */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookieSetOptions, AstroCookies } from 'astro';
import { SANITY_API_READ_TOKEN } from 'astro:env/server';
import type { ClientPerspective } from '@sanity/client';
import { perspectiveCookieName, urlSearchParamPreviewPerspective } from '@sanity/preview-url-secret/constants';
import { sanityClient } from '../client';

export const DRAFT_MODE_COOKIE = 'sanity-draft-mode';
export { perspectiveCookieName };

/** How long draft mode lasts before the Visual editor has to switch it on again: a working day. */
const MAX_AGE = 12 * 60 * 60;

/** The draft-mode cookies. The Visual editor frames the site from the Studio's own domain, so they
    must be sent in a cross-site frame (SameSite=None, which needs Secure); Partitioned keeps them
    working in browsers that block third-party cookies. */
export const cookieOptions = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  partitioned: true,
  maxAge: MAX_AGE,
} satisfies AstroCookieSetOptions;

/** The read token, if this deployment has one: draft mode needs it. */
export const readToken = (): string | undefined => SANITY_API_READ_TOKEN || undefined;

// The cookie's value is when it was issued, signed with the read token, so it
// can't be made up or kept beyond MAX_AGE, and rotating the token ends every
// draft session.
const signature = (issuedAt: string, token: string) =>
  createHmac('sha256', token).update(`tomrowstudios draft mode ${issuedAt}`).digest('base64url');

export function draftModeCookie(token: string): string {
  const issuedAt = String(Math.floor(Date.now() / 1000));
  return `${issuedAt}.${signature(issuedAt, token)}`;
}

function isValidCookie(value: string | undefined, token: string): boolean {
  const [issuedAt = '', signed = ''] = value?.split('.') ?? [];
  const age = Date.now() / 1000 - Number(issuedAt);
  if (!signed || !(age >= 0 && age < MAX_AGE)) return false;
  const expected = Buffer.from(signature(issuedAt, token));
  const actual = Buffer.from(signed);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** The content the Visual editor is showing: drafts, unless it is set to published or to a
    release (a comma-separated stack of IDs, ending in "drafts"). Anything else means drafts. */
function perspectiveFrom(value: string | null | undefined): ClientPerspective {
  if (value === 'published' || value === 'drafts') return value;
  const stack = value?.split(',') ?? [];
  const isRelease = stack.length > 1 && stack.at(-1) === 'drafts' && stack.every((id) => /^[\w.-]+$/.test(id));
  return isRelease ? stack : 'drafts';
}

/**
 * The Sanity client for a request in draft mode, reading drafts with the token and bypassing
 * the CDN; null when the request isn't in draft mode. The Visual editor adds the perspective it
 * shows to the URLs it opens; the cookie keeps it for the pages visited after.
 */
export function draftClient({ cookies, url }: { cookies: AstroCookies; url: URL }) {
  const token = readToken();
  if (!token || !isValidCookie(cookies.get(DRAFT_MODE_COOKIE)?.value, token)) return null;

  const requested = url.searchParams.get(urlSearchParamPreviewPerspective);
  if (requested && requested !== cookies.get(perspectiveCookieName)?.value) {
    cookies.set(perspectiveCookieName, requested, cookieOptions);
  }
  const perspective = perspectiveFrom(requested ?? cookies.get(perspectiveCookieName)?.value);

  return sanityClient.withConfig({ token, perspective, useCdn: false, stega: false });
}
