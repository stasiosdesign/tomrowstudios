/* The site's Sanity client: published content only, no token.

   Production is fully static, so it reads content once, at build time: straight
   from the API rather than the CDN, so a build always sees the latest publish,
   and published documents only, never drafts. Something published in the
   Studio reaches production on its next build (the publish webhook starts one).
   Staging renders every request, with this client or, in draft mode, a copy
   that reads drafts with the server-side token (./draft-mode). Pages take the
   right one from Astro.locals.sanity (src/middleware.ts).

   This module holds nothing secret, so the browser code can use it too
   (image URLs, live-preview.ts). The project ID and dataset are public values;
   the env vars are only there to point a build at another dataset. Stega (the
   invisible edit markers in strings) stays off: the Visual editor marks the
   editable parts itself, and the markers would break the text animations. */
import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || '5cwu7mnl',
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-09-24',
  useCdn: false,
  perspective: 'published',
  stega: false,
});
