/* Which Sanity content each page gets, and staging's "do not index".

   Production is static: this runs once per page while the site is built and
   only ever hands the page published content. On staging and in development
   every request is rendered: a browser in draft mode (src/sanity/draft-mode/)
   gets drafts, anyone else published content, and every response is marked
   noindex, whatever domain it is served from. */
import { defineMiddleware } from 'astro:middleware';
import { sanityClient } from './sanity/client';
import { draftClient } from './sanity/draft-mode';

const PRODUCTION = __DEPLOYMENT__ === 'production';

export const onRequest = defineMiddleware(async (context, next) => {
  if (PRODUCTION || context.isPrerendered) {
    context.locals.sanity = sanityClient;
    context.locals.draftMode = false;
    return next();
  }

  const drafts = draftClient(context);
  context.locals.sanity = drafts ?? sanityClient;
  context.locals.draftMode = drafts !== null;

  const response = await next();
  const headers: Record<string, string> = { 'X-Robots-Tag': 'noindex, nofollow' };
  // Drafts are for this browser only: never stored by a cache on the way
  if (drafts) headers['Cache-Control'] = 'private, no-store';
  return withHeaders(response, headers);
});

// Some responses (Response.redirect, for one) have read-only headers: those are copied first
function withHeaders(response: Response, headers: Record<string, string>): Response {
  try {
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
    return response;
  } catch {
    return withHeaders(new Response(response.body, response), headers);
  }
}
