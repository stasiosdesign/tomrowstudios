/** Which deployment this build is for, fixed at build time from Vercel's VERCEL_ENV (astro.config.mjs). */
declare const __DEPLOYMENT__: 'production' | 'staging' | 'development';

declare namespace astroHTML.JSX {
  interface TextareaHTMLAttributes {
    /** The shortest message accepted: the site's form validation reads it (public/js/formvalidation.js). */
    min?: string | number | undefined | null;
  }
}

declare namespace App {
  interface Locals {
    /** Sanity for this page: published content, or drafts in draft mode (src/middleware.ts). */
    sanity: import('@sanity/client').SanityClient;
    /** Whether this request is in draft mode. Only ever true on staging and in development. */
    draftMode: boolean;
  }
}
