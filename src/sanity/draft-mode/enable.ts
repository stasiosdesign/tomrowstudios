/* GET /api/draft-mode/enable: where the Studio's Visual editor opens the site
   (previewMode in studio/sanity.config.ts). Staging and development only.

   The URL carries the preview secret the Studio has just created, the page to
   show and, when staging is protected by Vercel Authentication, Vercel's bypass
   parameters. validatePreviewUrl checks the secret against the dataset with
   the read token and returns the page to go to, bypass parameters included,
   so Vercel lets the redirected request through too. */
import type { APIRoute } from 'astro';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { sanityClient } from '../client';
import { DRAFT_MODE_COOKIE, cookieOptions, draftModeCookie, perspectiveCookieName, readToken } from '.';

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const token = readToken();
  if (!token) {
    return text(
      'Draft mode is not set up on this deployment: it needs SANITY_API_READ_TOKEN (see the README, "Environment variables").',
      503,
    );
  }

  const { isValid, redirectTo = '/', studioPreviewPerspective } = await validatePreviewUrl(
    sanityClient.withConfig({ token }),
    request.url,
  );
  if (!isValid) return text('This preview link is invalid or has expired. Open the page again from the Studio.', 401);

  // The perspective is checked where it is read (draftClient)
  cookies.set(DRAFT_MODE_COOKIE, draftModeCookie(token), cookieOptions);
  cookies.set(perspectiveCookieName, studioPreviewPerspective || 'drafts', cookieOptions);
  return redirect(redirectTo, 307);
};
