# Tomrow Studios

The Tomrow Studios website: a static [Astro](https://astro.build) site whose
architecture projects and client logos are managed in
[Sanity](https://www.sanity.io). One repository, two apps:

- **the website**, at the root, built and deployed by Vercel from `main`
- **the Sanity Studio**, in `studio/`, where that content is edited

## Structure

```
.claude/                   Claude Code: dev-server launchers, the Sanity skill
public/
  assets/                  images the pages use, served at /assets/...
    brand/ graphics/ logos/ photos/<set>/ ui/
  js/                      the page scripts (classic scripts, one global scope)
src/
  layouts/BaseLayout.astro <head>, persistent overlays, Barba container, script tags
  components/              SiteNav, SiteFooter, ContactPanel, Button, ...
  pages/                   one .astro file per page -> /<name>.html
    project-[slug].astro   one page per Sanity project -> /project-<slug>.html
  sanity/                  the site's Sanity code: client, image URLs, queries, generated types
  styles/style.css         global stylesheet, imported once by the layout
studio/                    Sanity Studio, with its own package.json
  schemaTypes/             documents/ (project, client), objects/ (page blocks), shared/
  sanity.config.ts         project, dataset, plugins and the sidebar (structure.ts)
  sanity.cli.ts            CLI settings, including TypeGen
astro.config.mjs           static output, build.format 'file' (page.html URLs), compressHTML off
vercel.json                Vercel: Astro, `npm run build`, dist/
```

## Running it locally

Node 22.12 or newer. The two apps install their own dependencies.

```bash
# Website
npm install
npm run dev        # dev server (on this machine 4321 is blocked: add -- --port 8766)
npm run build      # production build -> dist/
npm run preview    # serve the build

# Studio, at http://localhost:3333 (log in with your Sanity account)
cd studio
npm install
npm run dev        # or, from the root: npm run studio
```

## How the site gets its content

- Content lives in Sanity's cloud: project `5cwu7mnl`, dataset `production`.
  The Studio edits it; the website reads it.
- The site reads it **at build time**, published documents only, with
  `@sanity/client` (`src/sanity/client.ts`). Every query is in
  `src/sanity/queries.ts`; images come from Sanity's image CDN
  (`src/sanity/image.ts`).
- Sanity drives the Architecture slider, the project pages and the home
  page's client logo wall. Everything else is written in the pages.
- `src/sanity/sanity.types.ts` is generated: run `npm run typegen` in
  `studio/` after changing the schema or a query (`npm run dev` there also
  keeps it up to date).

**Environment variables:** none are required. The dataset is public, so the
site needs no token, and the project ID and dataset have defaults;
`PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` override them, e.g. to
build against another dataset. `.env` files are git-ignored; never commit
secrets.

## Deployment

- Vercel builds the repository root on every push to `main`
  (`vercel.json`: `npm run build` -> `dist/`). `studio/` is not part of that
  build.
- The site is static, so something published in the Studio appears after the
  next deploy: a push, "Redeploy" in Vercel, or, once it is set up, a Sanity
  webhook that calls a Vercel deploy hook on every publish.
- The Studio runs locally. To use it from any computer, `npm run deploy` in
  `studio/` hosts it on sanity.studio (not set up yet).

## Assets

- Images a page references directly go in `public/assets/`, by kind
  (`photos/<set>/`, `logos/`, `brand/`, `graphics/`, `ui/`), and are referenced
  as `assets/...`.
- Project images and client logos are uploaded in the Studio, not added to
  `public/`.
- Original full-size photos stay out of the repository: keep them in
  `source-assets/` (git-ignored) and add optimised copies to
  `public/assets/photos/`.

## Editing content

1. Start the Studio (`npm run studio`) and log in.
2. Edit or add a **Project** or **Client**, then **Publish**.
3. It reaches the live site on the next deploy. A new project gets its page,
   `project-<slug>.html`, and its slider card automatically; its **Order**
   field sets its place on the slider and which project its "Next project"
   link goes to.

## Notes

- Page transitions are Barba.js: every page keeps the `data-barba="wrapper"` /
  `data-barba="container"` structure and the `data-barba-namespace` /
  `data-page-name` attributes, which the layout takes as props.
- The scripts in `public/js` deliberately stay as classic `<script src>` tags
  (`is:inline`): `transitions.js` calls each file's `init…` function by global
  name after every navigation, so they must not be bundled into ES modules.
- Internal links use `page.html` on purpose; `build.format: 'file'` emits the
  matching files, so no URL changed in the move to Astro.
