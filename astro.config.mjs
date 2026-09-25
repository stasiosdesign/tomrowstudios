// @ts-check
import { fileURLToPath } from 'node:url';
import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

/* Visual editing, for the Studio's Presentation tool (src/sanity/visual-editing.ts).
   On only where SANITY_VISUAL_EDITING is true, read the way the pages read it:
   from .env.development.local under `astro dev`, from the build's environment
   under `astro build`, so the production build never switches it on. When on,
   it adds the draft-mode routes the Studio calls and renders the home page on
   each request, so it can show unpublished drafts. */
let visualEditingOn = false;

/** @type {import('astro').AstroIntegration} */
const visualEditing = {
  name: 'tomrow-visual-editing',
  hooks: {
    'astro:config:setup': ({ command, config, injectRoute, logger }) => {
      const mode = command === 'dev' ? 'development' : 'production';
      const env = loadEnv(mode, fileURLToPath(config.root), '');
      visualEditingOn = env.SANITY_VISUAL_EDITING === 'true';
      if (!visualEditingOn) return;
      injectRoute({ pattern: '/api/draft-mode/enable', entrypoint: './src/sanity/draft-mode/enable.ts', prerender: false });
      injectRoute({ pattern: '/api/draft-mode/disable', entrypoint: './src/sanity/draft-mode/disable.ts', prerender: false });
      logger.info('Visual editing is on: inside the Studio, the home page shows drafts');
    },
    'astro:route:setup': ({ route }) => {
      if (visualEditingOn && route.component === 'src/pages/index.astro') route.prerender = false;
    },
  },
};

// https://astro.build/config
export default defineConfig({
  // Fully static site — no adapter needed; Vercel serves `dist/` as-is.
  output: 'static',

  // Except the hosted preview: a separate Vercel project built with
  // SANITY_VISUAL_EDITING=true renders its home page and draft-mode routes on
  // each request, which takes the Vercel adapter. Every other page stays static.
  adapter: process.env.SANITY_VISUAL_EDITING === 'true' ? vercel() : undefined,

  integrations: [visualEditing],

  // Emit `dist/page.html` rather than `dist/page/index.html`. Vercel serves each
  // file at its clean URL, /page (cleanUrls in vercel.json), and redirects the
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
