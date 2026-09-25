// @ts-check
import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';

/* One codebase, built three ways. Which one comes from Vercel (VERCEL_ENV),
   never from a hostname, so a custom domain changes nothing here:

   production   `main` on Vercel, and `npm run build` on your machine. Fully
                static: every page is built from published Sanity content and
                served as a file. The only build search engines may index.
   staging      every other Vercel deployment: the `staging` branch (and any
                other branch pushed to GitHub). Each request is rendered by a
                Vercel Function, so staging always has the latest content:
                published, or drafts in draft mode, which the Studio's Visual
                editor switches on (src/sanity/draft-mode/). Never indexed.
   development  `npm run dev`: staging's behaviour, on your machine. */
const { VERCEL_ENV, NODE_ENV } = process.env;
const deployment =
  VERCEL_ENV === 'production' ? 'production'
  : VERCEL_ENV === 'preview' ? 'staging'
  : VERCEL_ENV === 'development' || NODE_ENV === 'development' ? 'development'
  : 'production';
const onDemand = deployment !== 'production';

// The public site's address. Canonical links, Open Graph URLs, the sitemap and
// robots.txt all point there, from staging too, so production is the one
// canonical site. SITE_URL sets it (see .env.example); on Vercel it otherwise
// falls back to the project's production domain.
const env = { ...loadEnv(NODE_ENV ?? 'production', process.cwd(), ''), ...process.env };
const site =
  env.SITE_URL ||
  (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

// Staging and development only: the two routes that switch draft mode on and
// off. Production is built without them, so it has nothing to switch.
/** @returns {import('astro').AstroIntegration} */
const draftModeRoutes = () => ({
  name: 'tomrowstudios:draft-mode',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({ pattern: '/api/draft-mode/enable', entrypoint: './src/sanity/draft-mode/enable.ts', prerender: false });
      injectRoute({ pattern: '/api/draft-mode/disable', entrypoint: './src/sanity/draft-mode/disable.ts', prerender: false });
    },
  },
});

// https://astro.build/config
export default defineConfig({
  site,

  // Production: static, no adapter; Vercel serves `dist/` as files. Staging and
  // development render every request, through the Vercel adapter.
  output: onDemand ? 'server' : 'static',
  adapter: onDemand ? vercel() : undefined,

  integrations: [
    ...(deployment === 'production' ? [sitemap()] : []),
    ...(onDemand ? [draftModeRoutes()] : []),
  ],

  env: {
    schema: {
      // A Sanity Viewer token, for draft mode on staging and in development.
      // Secret: read on the server at request time, never sent to a browser.
      SANITY_API_READ_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    // The deployment, fixed at build time (src/env.d.ts). Code that only
    // staging needs checks it, so a production build leaves that code out.
    define: { __DEPLOYMENT__: JSON.stringify(deployment) },
  },

  // Emit `dist/page.html` rather than `dist/page/index.html`. Vercel serves each
  // file at its clean URL, /page (cleanUrls in vercel.ts), and redirects the
  // old /page.html addresses there; every internal link uses the clean form.
  build: {
    format: 'file',
  },
  trailingSlash: 'never',

  // Astro 7 applies JSX whitespace rules by default, which collapses the
  // whitespace between inline elements. The layout relies on the original
  // hand-written spacing, so the markup is passed through untouched.
  compressHTML: false,
});
