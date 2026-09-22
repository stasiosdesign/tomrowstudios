# Tomrow Studios

Static marketing site, built with [Astro](https://astro.build) and deployed to Vercel from this repository (`main`).

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## Structure

```
astro.config.mjs        static output, build.format 'file' (page.html URLs), compressHTML off
vercel.json             framework/build/output settings for Vercel
public/
  assets/               photos, logos, brand, UI SVGs (served at /assets/...)
  js/                   the site's page scripts (classic scripts, one global scope)
src/
  layouts/BaseLayout.astro   <head>, persistent overlays, Barba container, script tags
  components/
    SiteNav.astro            fixed site bar
    SiteFooter.astro         footer with parallax reveal
    ContactPanel.astro       "Start a project" slide-out drawer + form
    Button.astro             the button-011 pattern (label + link attributes)
  pages/                     one .astro file per page → /<name>.html
  styles/style.css           global stylesheet, imported once by the layout
```

## Notes

- Page transitions are Barba.js: every page keeps the `data-barba="wrapper"` /
  `data-barba="container"` structure and the `data-barba-namespace` /
  `data-page-name` attributes, which the layout takes as props.
- The scripts in `public/js` deliberately stay as classic `<script src>` tags
  (`is:inline`): `transitions.js` calls each file's `init…` function by global
  name after every navigation, so they must not be bundled into ES modules.
- Internal links use `page.html` on purpose; `build.format: 'file'` emits the
  matching files so no URL changed in the move to Astro.
