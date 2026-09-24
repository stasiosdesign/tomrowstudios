/* The site's read-only Sanity client.

   The site is fully static, so content is read once, at build time: straight
   from the API rather than the CDN, so a build always sees the latest publish,
   and published documents only, never drafts. Something published in the
   Studio reaches the site on its next build. The project ID and dataset are
   public values; the env vars are only there to point a build at another
   dataset. */
import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || '5cwu7mnl',
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-09-24',
  useCdn: false,
  perspective: 'published',
});
