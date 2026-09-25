// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Fully static site — no adapter needed; Vercel serves `dist/` as-is.
  output: 'static',

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
