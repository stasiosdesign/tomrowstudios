/* The Presentation tool opens the site through here, with a one-time secret
   it has just stored in the dataset. A valid secret turns on draft mode for
   this browser: a cookie the Studio's preview frame keeps (SameSite=None and
   Partitioned, so it works inside the frame). Added to the site only when
   visual editing is on; see astro.config.mjs. */
import type { APIRoute } from 'astro';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { sanityClient } from '../client';
import { DRAFT_MODE_COOKIE } from '../visual-editing';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const token = import.meta.env.SANITY_API_READ_TOKEN;
  if (!token) {
    return new Response('Visual editing needs a Sanity read token: SANITY_API_READ_TOKEN (see .env.development.local).', {
      status: 500,
    });
  }
  const { isValid, redirectTo = '/' } = await validatePreviewUrl(sanityClient.withConfig({ token }), request.url);
  if (!isValid) return new Response('Invalid preview secret', { status: 401 });

  cookies.set(DRAFT_MODE_COOKIE, '1', { path: '/', httpOnly: true, secure: true, sameSite: 'none', partitioned: true });
  return redirect(redirectTo, 307);
};
