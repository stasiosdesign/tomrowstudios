# Tomrow Studios

The Tomrow Studios website: an [Astro](https://astro.build) site whose content
is managed in [Sanity](https://www.sanity.io). One repository, two apps:

- **the website**, at the root, deployed by Vercel
- **the Sanity Studio**, in `studio/`, where the content is edited

and one of everything else: one Vercel project, one Sanity project
(`5cwu7mnl`) with one dataset (`production`). Two deployments come out of it,
like a Webflow site's live and staging domains.

## Addresses

|            | URL                                                     | From                        |
| ---------- | ------------------------------------------------------- | --------------------------- |
| Production | https://tomrowstudios.vercel.app                        | `main`                      |
| Staging    | https://tomrowstudios-git-staging-stasiosdesign.vercel.app | `staging`                |
| Studio     | https://tomrowstudios.sanity.studio                     | `studio/`, deployed by hand |

Staging's URL is Vercel's alias for the `staging` branch: it always shows the
branch's latest deployment. (Every deployment also has its own unique URL.)
The Vercel project is `tomrowstudios`, in the `stasiosdesign` team.

## Production and staging

|                    | Production (`main`)                    | Staging (`staging`)                               |
| ------------------ | -------------------------------------- | ------------------------------------------------- |
| Built              | static, at deploy time                 | on each request, by a Vercel Function             |
| Sanity content     | live copies only (`live.<id>`)         | published documents; drafts in draft mode         |
| Visual editor      | never                                  | the Studio's Visual editor shows staging          |
| Search engines     | indexed: robots.txt, sitemap           | never: `noindex, nofollow` on every response      |
| Access             | public                                 | Vercel Authentication (and the Studio's bypass)   |

Which is which comes from Vercel itself (`VERCEL_ENV`: `production` for
`main`, `preview` for every other branch), read in `astro.config.mjs`. Nothing
depends on a hostname, so adding a domain changes no code. `npm run dev`
behaves like staging, on your machine.

## Workflow

```
local (npm run dev, npm run studio)  →  staging  →  review  →  main
```

1. **Work locally.** Nothing is deployed until you push.
2. **Send changes to staging**, when you want them online:
   `git switch staging`, commit, `git push`. Staging updates in about a minute.
3. **Review** on the staging URL, or in the Studio's Visual editor, where
   staging shows your unpublished drafts too.
4. **Promote to production** once approved. `main` only ever fast-forwards to
   `staging`, so after this the two branches are identical again:

   ```
   git switch main
   git merge --ff-only staging
   git push
   git switch staging
   ```

   If the merge refuses, `main` has something staging lacks: `git merge main`
   on `staging`, push, review, then promote.

## Running it locally

Node 22 (what Vercel uses). The two apps install their own dependencies:
`npm install`, then `npm install` in `studio/`.

| Command                 | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run dev`           | the site's dev server (on this machine: `npm run dev -- --port 8766`) |
| `npm run studio`        | the Studio at http://localhost:3333; its Visual editor shows http://localhost:8766 |
| `npm run build`         | the production build, into `dist/`                               |
| `npm run preview`       | serves that build                                                |
| `npm run check`         | type-checks the site and the Studio, lints the Studio            |
| `npm run typegen`       | regenerates the query types (`src/sanity/sanity.types.ts`) after a query or schema change |
| `npm run studio:deploy` | deploys the hosted Studio                                        |

To see drafts locally, put a Sanity read token in `.env.development.local`
(see `.env.example`). Without one the site shows published content, and the
Visual editor still shows edits to the home page live.

## Content: draft, staging, live

One dataset holds three states of every document, and each site reads one of
them (`src/sanity/content.ts`, `studio/lib/live.ts`):

| State     | Document ID   | Made by                       | Shown by                                   |
| --------- | ------------- | ----------------------------- | ------------------------------------------ |
| Draft     | `drafts.<id>` | typing in the Studio (autosave) | staging, in draft mode only              |
| Staging   | `<id>`        | **Publish to staging**        | staging, to everyone                       |
| Live      | `live.<id>`   | **Publish live**              | production, at its next build              |

- **Production** is built from the live copies alone, once, at build time
  (`src/sanity/client.ts`, no token, no drafts, no edit markers; every query
  takes `$live`, true there). Its build has no draft-mode routes and no
  visual-editing code at all. A code release rebuilds it from the live copies
  as they are, so deploying code never sweeps staged content along.
- **Staging** reads Sanity on every request: published documents for anyone,
  drafts for a browser in **draft mode**. The Studio's Visual editor switches
  draft mode on: it opens staging at `/api/draft-mode/enable` with a secret it
  has just written into the dataset (valid for an hour); the site checks the
  secret with the read token, on the server, and sets a signed cookie that
  lasts 12 hours. Pages in draft mode say **[ Drafts ]**, with an **Exit** link
  (`/api/draft-mode/disable`). The token never reaches a browser.
- In the Visual editor, edits to every page's editable words, photos and
  button labels appear as you type (`src/sanity/live-preview.ts`); anything
  else a draft changes (a new project, an added photo in a gallery) appears
  when the preview reloads.
- The Studio's **Share** menu in the Visual editor can make a link to the
  current preview for someone without a Studio or Vercel login.

### Publishing

The publishing bar along the bottom of every document in the Studio
(`studio/components/PublishBar.tsx`) says where the item stands (saved,
staging, live) and holds the actions:

- **Publish to staging**: Sanity's own publish. The draft becomes the
  published document; staging shows it on its next request. Production does
  not change, even for an item that is already live.
- **Publish live**: copies the published document to its live copy
  (`live.<id>`), publishing the draft to staging first if there is one. The
  dialog names the item and the site. Only that item changes; a reference to
  something not yet live is refused, with the missing items named. Production
  then rebuilds (below); the bar watches the site's build stamp
  (`/build.json`, written by every production build) and says when the change
  is on the site.
- **Unpublish…**: from staging, from the live site, or both, chosen in the
  dialog. Unpublishing from staging turns the published document back into a
  draft; unpublishing from the live site deletes the live copy. Either way the
  item stays in the Studio to edit and publish again, and the other site is
  untouched.
- **Delete** (collections only) removes the draft, the published document and
  the live copy, after a dialog that says which sites it is on.

A Sanity webhook, **Rebuild the site on publish**, calls a Vercel deploy hook
that rebuilds `main`. It should fire on changes to live copies alone: filter
`_id in path("live.*")` (sanity.io/manage → API → Webhooks). It never fires
for drafts, so editing never deploys anything, and staging needs no rebuild:
it reads Sanity on every request.

Live copies are never edited directly: opening one (from a search result,
say) shows a note and the way to the item itself. Two scripts in
`studio/scripts/` work on them from the command line, run from `studio/`
with `npx sanity exec <script> --with-user-token`: `publish-all-live.ts`
gives every published document a live copy (the one-off step that moved the
site to live copies; safe to run again, and `-- --all` releases everything on
staging at once) and `live-status.ts` lists where every document stands.

## Search engines

Production is the only site search engines may index: it serves `robots.txt`
and `sitemap-index.xml`, and every page names its production address in
`<link rel="canonical">` and `og:url` (from `SITE_URL`).

Staging can never compete with it. Every response, pages and files alike, is
sent with `X-Robots-Tag: noindex, nofollow` (`vercel.ts` for everything,
`src/middleware.ts` again for pages), every page has
`<meta name="robots" content="noindex, nofollow">`, its canonical links point
at production, and it has no sitemap. This is built into the site, not left to
Vercel's own preview header, which a custom staging domain wouldn't get. Its
`robots.txt` doesn't block crawling, on purpose: a crawler has to fetch a page
to see its noindex. Vercel Authentication keeps crawlers out anyway.

## Environment variables

The site's, set in Vercel (Settings → Environment Variables) and locally in
`.env.development.local` (see `.env.example`):

| Variable                           | Production          | Preview                  | Local                          |
| ---------------------------------- | ------------------- | ------------------------ | ------------------------------ |
| `SITE_URL`                         | the production URL  | the same production URL  | optional                       |
| `SANITY_API_READ_TOKEN` (secret)   | not set             | Git branch `staging` only | optional, for drafts          |

The Studio's, in committed files: `SANITY_STUDIO_PREVIEW_ORIGIN`, the site its
Visual editor shows: staging's URL in `studio/.env.production` (the hosted
Studio), http://localhost:8766 in `studio/.env.development` (`npm run studio`);
and `SANITY_STUDIO_PRODUCTION_ORIGIN`, the live site, for the publishing bar's
links and the build stamp it watches.

- `SITE_URL` falls back to Vercel's production domain when unset.
- `SANITY_API_READ_TOKEN` is a Sanity API token with the **Viewer** role. It is
  read on the server at request time and is never given a `PUBLIC_` prefix.
- Vercel provides `VERCEL_ENV` and `VERCEL_PROJECT_PRODUCTION_URL` itself.
- `PUBLIC_SANITY_PROJECT_ID` / `PUBLIC_SANITY_DATASET` can point a build at
  another project or dataset; they default to this one.
- Real values live in Vercel and in git-ignored `.env*.local` files. The two
  Studio files are committed because they hold public settings only: every
  `SANITY_STUDIO_` value is compiled into the public Studio.

## Vercel

- One project, connected to `stasiosdesign/tomrowstudios`; production branch
  `main`. Build settings, clean URLs, redirects and staging's noindex header
  are in `vercel.ts` (which replaced `vercel.json`: Vercel reads one or the
  other).
- **Deployment Protection:** Vercel Authentication protects every deployment
  except the production domain. The Studio gets through with Vercel's
  *Protection Bypass for Automation* secret, saved once in the Studio's
  **Vercel Protection Bypass** tool.
- **Deploy hook** "Sanity publish" on `main`, called by the Sanity webhook
  above (which should filter on `_id in path("live.*")`, so only a live
  publish or unpublish rebuilds the site). Its URL is a secret: it lives only
  in the webhook.
- **`/build.json`** is served with `Access-Control-Allow-Origin: *` and
  `Cache-Control: no-store` (`vercel.ts`), so the Studio can read the build
  stamp from its own origin.
- **Environment variables:** `SITE_URL` (Production and Preview) and
  `SANITY_API_READ_TOKEN` (Preview, branch `staging`); see below.

## Adding a custom domain

No code changes:

1. Vercel → Settings → Domains: add `example.com` and `www.example.com` for
   Production (one redirecting to the other).
2. Add `staging.example.com` and connect it to the Git branch `staging`.
   Vercel Authentication protects it like any preview domain.
3. Vercel → Environment Variables: set `SITE_URL` to the production domain,
   e.g. `https://www.example.com`, for Production and Preview.
4. `studio/.env.production`: set `SANITY_STUDIO_PREVIEW_ORIGIN` to
   `https://staging.example.com`; commit it, then `npm run studio:deploy`.
5. Sanity (sanity.io/manage → API → CORS origins, or
   `npx sanity cors add https://staging.example.com --no-credentials` in
   `studio/`): add the staging domain.
6. Redeploy: push to `staging`, then promote to `main` (or redeploy
   production in Vercel).
7. Optionally redirect the old `vercel.app` domain to the new production
   domain.

## Structure

```
.claude/                   Claude Code: dev-server launchers, the Sanity skill
public/                    images (assets/) and page scripts (js/), served as-is
src/
  layouts/BaseLayout.astro <head> (canonical, robots), persistent overlays, Barba container, scripts
  components/              SiteNav, SiteFooter, ContactPanel, Button, DraftModeLabel, ...
  pages/                   one .astro file per page -> /<name>
    projects/[slug].astro  one page per Sanity project -> /projects/<slug>
    robots.txt.ts          robots.txt, per deployment
  middleware.ts            each page's Sanity client (drafts in draft mode); staging's noindex header
  sanity/                  client, image URLs, queries (every GROQ query), generated types,
    content.ts             which side of the dataset this deployment reads ($live)
    page-defaults.ts       every page's words and photos as the code had them: the fallbacks and the seed
    draft-mode/            the draft-mode routes and cookie (staging and local only)
    live-preview.ts        click-to-edit inside the Studio's Visual editor (staging and local only)
  styles/style.css         global stylesheet, imported once by the layout
studio/                    Sanity Studio, with its own package.json
  schemaTypes/             documents/ (homePage, project, client), pages/ (one per fixed page), objects/, shared/
  components/              CollectionPane (the tables), PublishBar, DocumentLayout, the home page's form parts
  lib/live.ts              the live copies: IDs, copying, comparing, reference checks
  lib/site.ts              the two sites' addresses and each document's page
  scripts/                 publish-all-live, live-status, seed-pages (npx sanity exec … --with-user-token)
  structure.ts             the Content sidebar: Page editor, CMS collections
  sanity.config.ts         project, plugins (Visual editor, Content, Vision, Vercel bypass), document layout
  sanity.cli.ts            CLI settings, including TypeGen
  studio.css               the red Publish live button, the sidebar's headings
  .env.development/.production  which sites the Visual editor and the publishing bar use (public)
astro.config.mjs           production static / staging on request, by deployment; the build stamp
vercel.ts                  Vercel: build, clean URLs, redirects, staging's noindex header, build.json's headers
```

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

1. Open https://tomrowstudios.sanity.studio (or `npm run studio`) and log in.
   Editors must be members of the Sanity project (sanity.io/manage → Members).
2. The **Visual editor** shows staging with your drafts, each page beside its
   form; **Content** has the same documents as plain forms, in two parts
   (`studio/structure.ts`):
   - **Page editor**: the site's fixed pages, one document each (Home,
     Architecture, Influence, Partners, Partners archive, Shop, Masterclass,
     Communication package, Digital Sketchbook, Book, Privacy, Terms). Each
     holds that page's editable words, photos and button labels, section by
     section; layout, navigation and where buttons lead stay in the code
     (`studio/schemaTypes/pages/`, defaults in `src/sanity/page-defaults.ts`).
     The Architecture page is here; the projects on it are not.
   - **CMS collections**: Projects and Clients, each a table of its items
     (`studio/components/CollectionPane.tsx`) with search, a **New** button
     and a **Columns** chooser (any field of the type; the choice is kept per
     collection in the browser). A row opens the item beside a compact list
     of the others; **All projects** brings the table back as it was.
3. **Publish to staging**, review on staging (or in the Visual editor), then
   **Publish live**. Production has it about a minute later; the publishing
   bar says when. A new project gets its page, `/projects/<slug>`, and its
   slider card automatically; its **Order** field sets its place on the
   slider and which project its "Next project" link goes to.

After changing Studio code or the schema, deploy the Studio
(`npm run studio:deploy`). It serves both environments from the one dataset, so
keep schema changes compatible with the code on `main`. A new page type needs
its documents seeded (`npx sanity exec scripts/seed-pages.ts
--with-user-token` in `studio/`, which creates the page and its live copy from
the defaults and never overwrites either) and the webhook's filter already
covers it.

## Notes

- Page transitions are Barba.js: every page keeps the `data-barba="wrapper"` /
  `data-barba="container"` structure and the `data-barba-namespace` /
  `data-page-name` attributes, which the layout takes as props.
- The scripts in `public/js` deliberately stay as classic `<script src>` tags
  (`is:inline`): `transitions.js` calls each file's `init…` function by global
  name after every navigation, so they must not be bundled into ES modules.
- URLs are clean: production's static build emits `page.html` files
  (`build.format: 'file'`) and Vercel serves them as `/page` (`cleanUrls`),
  redirecting the old `.html` addresses and the old `/project-<slug>` pages.
  Internal links and asset paths start at the root (`/shop`, `/assets/...`) so
  they work from any depth, including `/projects/<slug>`.
- Stega (Sanity's invisible edit markers in strings) is off everywhere: the
  Visual editor marks the editable parts itself, and the markers would break
  the text animations.
