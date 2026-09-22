// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Fully static site — no adapter needed; Vercel serves `dist/` as-is.
  output: 'static',

  // The site was authored as flat `.html` files and every internal link (and
  // Barba's fetch of the next page) points at `page.html`, so emit
  // `dist/page.html` rather than `dist/page/index.html` to keep every existing
  // URL working unchanged.
  build: {
    format: 'file',
  },
  trailingSlash: 'never',

  // Astro 7 applies JSX whitespace rules by default, which collapses the
  // whitespace between inline elements. The layout relies on the original
  // hand-written spacing, so the markup is passed through untouched.
  compressHTML: false,
});
