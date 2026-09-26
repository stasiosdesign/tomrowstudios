/* The site's Sanity client: published content only, no token.

   Two datasets, one for each site (see the README, "Content"): production
   reads `production`, which only holds what has been published live;
   staging and development read `staging`, where the Studio works. Which is
   which is fixed at build time from the deployment (astro.config.mjs);
   PUBLIC_SANITY_DATASET can still point a build elsewhere.

   Production is fully static, so it reads content once, at build time:
   straight from the API rather than the CDN, so a build always sees the
   latest publish, and published documents only, never drafts. Staging
   renders every request, with this client or, in draft mode, a copy that
   reads drafts with the server-side token (./draft-mode). Pages take the
   right one from Astro.locals.sanity (src/middleware.ts).

   This module holds nothing secret, so the browser code can use it too
   (image URLs, live-preview.ts). The project ID and dataset are public values.
   Stega (the invisible edit markers in strings) stays off: the Visual editor
   marks the editable parts itself, and the markers would break the text
   animations. */
import { createClient } from '@sanity/client';

export const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || '5cwu7mnl';

/** The dataset this deployment reads: the live site's, or the one the Studio edits */
export const dataset = import.meta.env.PUBLIC_SANITY_DATASET || (__DEPLOYMENT__ === 'production' ? 'production' : 'staging');

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2026-09-24',
  useCdn: false,
  perspective: 'published',
  stega: false,
});
