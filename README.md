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
| Sanity content     | published, as of the last **Go live**  | published; drafts in draft mode                   |
| Visual editor      | never                                  | the Studio's Visual editor shows staging          |
| Search engines     | indexed: robots.txt, sitemap           | never: `noindex, nofollow` on every response      |
| Access             | public                                 | Vercel Authentication (and the Studio's bypass)   |

Which is which comes from Vercel itself (`VERCEL_ENV`: `production` for
`main`, `preview` for every other branch), read in `astro.config.mjs`. Nothing
depends on a hostname, so adding a domain changes no code. `npm run dev`
behaves like staging, on your machine.

## Workflow

Content and code each reach the live site in their own two steps.

**Content, in the Studio:**

```
edit (a draft)  →  Publish to staging  →  Go live: Publish to live site
```

1. **Edit.** Changes save themselves as drafts, seen only in the Visual editor.
2. **Publish to staging** (the button on every page). The staging site shows it
   at once; the live site doesn't change.
3. **Go live** (in the Studio's top bar) lists everything published to staging
   but not live yet. **Publish to live site** rebuilds the live site with all
   of it, in about a minute. Like Webflow's publish, it takes the whole site.

**Code, in Git:**

```
local (npm run dev, npm run studio)  →  staging  →  review  →  main
```

A code release rebuilds the live site too, so it also takes live everything
published to staging by then; Go live's list shows what that is.

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

## Content: published and drafts

- **Production** reads published content only, once, while it is built
  (`src/sanity/client.ts`, no token, no drafts, no edit markers), so it shows
  what was published when it was last built: the last Go live or code
  release. Its build has no draft-mode routes and no visual-editing code at all.
- **Staging** reads Sanity on every request: published content for anyone,
  drafts for a browser in **draft mode**. The Studio's Visual editor switches
  draft mode on: it opens staging at `/api/draft-mode/enable` with a secret it
  has just written into the dataset (valid for an hour); the site checks the
  secret with the read token, on the server, and sets a signed cookie that
  lasts 12 hours. Pages in draft mode say **[ Drafts ]**, with an **Exit** link
  (`/api/draft-mode/disable`). The token never reaches a browser.
- In the Visual editor, edits to the home page and the Get in touch block
  appear as you type (`src/sanity/live-preview.ts`); anything else a draft
  changes (a new project, an added photo) appears when the preview reloads.
- The Studio's **Share** menu in the Visual editor can make a link to the
  current preview for someone without a Studio or Vercel login.

### Publishing: staging, then live

**Publish to staging** is Sanity's own Publish (relabelled in
`studio/sanity.config.ts`): staging, which reads Sanity on every request, shows
it at once, and nothing is rebuilt.

**Go live** (`studio/components/GoLiveTool.tsx`) writes one document,
`liveSite` (when, and by whom). A Sanity webhook, **Publish to live site**,
fires on that document alone and calls a Vercel deploy hook that rebuilds
`main`, so the live site shows everything published about a minute later.
Publishing, editing drafts and anything else never calls it.

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

The Studio's, in committed files, `studio/.env.production` (the hosted Studio)
and `studio/.env.development` (`npm run studio`):
`SANITY_STUDIO_PREVIEW_ORIGIN`, the site its Visual editor shows (staging's
URL; http://localhost:8766 locally), and `SANITY_STUDIO_SITE_URL`, the live
site the Go live tool links to (the same as `SITE_URL`).

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
  **Publish to live site** (the Go live button). Its URL is a secret: it
  lives only in the webhook.
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
4. `studio/.env.production` (and `.env.development`): set
   `SANITY_STUDIO_PREVIEW_ORIGIN` to `https://staging.example.com` and
   `SANITY_STUDIO_SITE_URL` to the production domain; commit, then
   `npm run studio:deploy`.
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
    draft-mode/            the draft-mode routes and cookie (staging and local only)
    live-preview.ts        click-to-edit inside the Studio's Visual editor (staging and local only)
  styles/style.css         global stylesheet, imported once by the layout
studio/                    Sanity Studio, with its own package.json
  schemaTypes/             documents/ (homePage, project, client, liveSite), objects/, shared/
  components/GoLiveTool.tsx  the Go live tool: Publish to live site
  sanity.config.ts         project, tools (Visual editor, Content, Go live, Vision, Vercel bypass),
                           the "Publish to staging" label, sidebar
  sanity.cli.ts            CLI settings, including TypeGen
  .env.development/.production  the site the Visual editor shows, the live site (public)
astro.config.mjs           production static / staging on request, by deployment
vercel.ts                  Vercel: build, clean URLs, redirects, staging's noindex header
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
2. The **Visual editor** shows staging with your drafts; **Content** has the
   same documents as plain forms.
3. **Publish to staging**: the staging site has it at once. A new project gets
   its page, `/projects/<slug>`, and its slider card automatically; its
   **Order** field sets its place on the slider and which project its "Next
   project" link goes to.
4. **Go live → Publish to live site** when staging is right: the live site has
   everything published about a minute later.

After changing Studio code or the schema, deploy the Studio
(`npm run studio:deploy`). It serves both environments from the one dataset, so
keep schema changes compatible with the code on `main`.

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
