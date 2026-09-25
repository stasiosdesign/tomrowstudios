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
  pages/                   one .astro file per page -> /<name>
    projects/[slug].astro  one page per Sanity project -> /projects/<slug>
  sanity/                  the site's Sanity code: client, image URLs, queries, generated types,
                           visual-editing.ts and draft-mode/ (the Studio's click-to-edit preview)
  styles/style.css         global stylesheet, imported once by the layout
studio/                    Sanity Studio, with its own package.json
  schemaTypes/             documents/ (homePage, project, client), objects/ (hero slide, page blocks), shared/
  sanity.config.ts         project, dataset, plugins and the sidebar (structure.ts)
  sanity.cli.ts            CLI settings, including TypeGen
astro.config.mjs           static output, build.format 'file' (page.html files), compressHTML off
vercel.json                Vercel: Astro, `npm run build`, dist/, clean URLs, old-URL redirects
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
- Sanity drives the home page hero (the **Home page** document), the home
  page's client logo wall, the Architecture slider and the project pages.
  Everything else is written in the pages.
- `src/sanity/sanity.types.ts` is generated: run `npm run typegen` in
  `studio/` after changing the schema or a query (`npm run dev` there also
  keeps it up to date).

**Environment variables:** none are required. The dataset is public, so the
site needs no token, and the project ID and dataset have defaults;
`PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` override them, e.g. to
build against another dataset. Visual editing (below) adds two, only where it
runs. `.env` files are git-ignored; never commit secrets.

## Visual editing (pilot: the home page hero)

In the Studio's **Presentation** tab the site appears with click-to-edit
outlines on the home hero: the headline, the dial's five slides (caption, dial
photo, background) and the two button labels. Edits show in the preview as
drafts; **Publish** makes them live. Layout stays in code, so only those
fields can change.

- It runs against your own dev server for now. `.env.development.local`
  (git-ignored, read only by `npm run dev`) sets `SANITY_VISUAL_EDITING=true`
  and holds `SANITY_API_READ_TOKEN`, a Sanity **Viewer** token, which lets the
  preview read drafts. Then run `npm run dev -- --port 8766` and
  `npm run studio`, and open http://localhost:3333 → Presentation.
- The production build never turns it on (`astro.config.mjs`), so the public
  site has no draft routes, editing markup or overlay code.
- Letting clients use it from the hosted Studio needs the preview hosted too:
  a second deployment built with those two variables (plus an adapter for its
  per-request home page), and the Studio redeployed with
  `SANITY_STUDIO_PREVIEW_ORIGIN` set to its address.

## Deployment

- Vercel builds the repository root on every push to `main`
  (`vercel.json`: `npm run build` -> `dist/`). `studio/` is not part of that
  build.
- The site is static, so every publish rebuilds it: a Sanity webhook
  ("Rebuild the site on publish", for the Home page, Projects and Clients)
  calls a Vercel deploy hook, and the change is live in about a minute.
- The Studio is hosted at **https://tomrowstudios.sanity.studio**. Editors
  must be members of the Sanity project (invite them under Members at
  sanity.io/manage). After changing Studio code, `npm run deploy` in
  `studio/` updates the hosted copy.

## Assets

- Images a page references directly go in `public/assets/`, by kind
  (`photos/<set>/`, `logos/`, `brand/`, `graphics/`, `ui/`), and are referenced
  from the root, as `/assets/...`.
- Project images and client logos are uploaded in the Studio, not added to
  `public/`.
- Original full-size photos stay out of the repository: keep them in
  `source-assets/` (git-ignored) and add optimised copies to
  `public/assets/photos/`.

## Editing content

1. Open https://tomrowstudios.sanity.studio (or run it locally with
   `npm run studio`) and log in.
2. Edit or add a **Project** or **Client**, then **Publish**.
3. It is live about a minute later. A new project gets its page,
   `/projects/<slug>`, and its slider card automatically; its **Order**
   field sets its place on the slider and which project its "Next project"
   link goes to.

## Notes

- Page transitions are Barba.js: every page keeps the `data-barba="wrapper"` /
  `data-barba="container"` structure and the `data-barba-namespace` /
  `data-page-name` attributes, which the layout takes as props.
- The scripts in `public/js` deliberately stay as classic `<script src>` tags
  (`is:inline`): `transitions.js` calls each file's `init…` function by global
  name after every navigation, so they must not be bundled into ES modules.
- URLs are clean: Astro emits `page.html` files (`build.format: 'file'`) and
  Vercel serves them as `/page` (`cleanUrls`), redirecting the old `.html`
  addresses and the old `/project-<slug>` pages. Internal links and asset
  paths start at the root (`/shop`, `/assets/...`) so they work from any
  depth, including `/projects/<slug>`.
