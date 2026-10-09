# Tomrow Studios: instructions for Claude

The Tomrow Studios website (Astro, repository root) and its Sanity Studio
(`studio/`). One repository, one Vercel project, one Sanity project and dataset.
The README explains the system; these are the working rules.

## Branches and deployments

- `main` is **production**: every push deploys the public site. Keep it
  production-ready at all times.
- `staging` is the permanent **staging** branch: every push updates the stable
  staging URL (see the README). It is not a feature branch; never delete it.

## How to work

1. Work locally first (`npm run dev`, `npm run studio`). Do not commit or push
   after each change.
2. When the user asks for an online preview, commit and push to `staging`.
3. Never push unfinished work to `main`.
4. Merge `staging` into `main` (and push) only when the user explicitly
   approves a production deployment. Run `npm run build` and `npm run check`
   first; afterwards confirm the Vercel status on the commit.
5. After a production merge, bring `staging` level with `main` (fast-forward
   or merge `main` into `staging`) so the branches don't drift apart.
6. No force-pushes, history rewrites or new long-lived branches.

## Rules that protect production

- Never commit secrets. Real values live in Vercel's environment variables and
  in git-ignored `.env*.local` files. Nothing secret gets a `PUBLIC_` or
  `SANITY_STUDIO_` prefix: those are compiled into public bundles.
- Keep Sanity's production/draft separation: production is built from
  published content only. Draft content, the read token, the draft-mode routes
  and the visual-editing code exist only off production (`__DEPLOYMENT__`,
  see `astro.config.mjs`).
- Staging must never be indexable: keep its noindex header, robots meta and
  production-canonical URLs.
- Never commit `source-assets/` (original photos, git-ignored).
- Never print tokens, the deploy hook URL or the Vercel bypass secret.

## Sanity

- Two datasets: `staging` (the Studio edits it; the staging site and the
  Visual editor read it) and `production` (the live site alone reads it; only
  the site's `/api/publish` route writes to it, with
  `SANITY_API_WRITE_TOKEN`, after checking the caller's Studio session). The
  publishing control is the CMS package's (see "The CMS"); the route
  is `src/sanity/publish/`. Keep that separation: production never reads
  `staging`, no browser code ever holds a write token, and publishing never
  touches Git.
- Dataset writes from here may be blocked by auto mode; the scripts in
  `studio/scripts/` are then for the user to run.
- Every query lives in `src/sanity/queries.ts`. After changing a query or the
  schema, run `npm run typegen`.
- The hosted Studio is deployed by hand (`npm run studio:deploy`), from
  whichever branch is checked out, and serves both environments. Deploy it
  after schema or Studio changes, and keep schema changes backward-compatible
  with the code on `main` (they share one dataset).

## The CMS

The Studio is the shared CMS package `@stasiosdesign/sanity-cms` (private,
GitHub Packages; source in the `sanity-cms` repository, checked out beside
this one at `../sanity-cms`, with its own CLAUDE.md) set up for this website.

| Kind of change | Where |
| --- | --- |
| How every Studio looks or works: navigation, layout, the Content tool, the Visual editor's controls, editors, publishing UI and logic, the theme | `../sanity-cms/src/`, developed in the stasiosdesign.com Studio (`../Stasiosdesign`), released, then updated here. Never in this repository. |
| This site's content model: pages, sections, fields, references | `studio/schemaTypes/` |
| This site's Studio setup: pages, collections, routes, brand, Visual editor locations, publishing wording | `studio/project.ts` |
| A bespoke editor only this site needs | `studio/components/`, used from the schema |
| The site's side of publishing and preview: the route, draft mode, the preview script | `src/sanity/` (the contract: the package's README, "What a website must provide") |

- `studio/package.json` pins an exact release; the lockfile makes builds
  and deploys reproducible. This Studio stays on its version while shared
  changes are developed elsewhere.
- Updates arrive as Dependabot pull requests against `staging`
  (`.github/dependabot.yml`), checked by `.github/workflows/studio.yml`:
  types, lint, the tests (the route's `contentKey` matches the package's:
  `studio/test/protocol.test.ts`), the schema unchanged, a full build.
  Merging is the user's approval; then the usual staging → main promotion and
  `npm run studio:deploy`. Never merge or deploy an update without approval.
  Read the package's CHANGELOG.md for what a version asks of the site.
- A change that needs both sides: the shared part in `../sanity-cms`; run
  this Studio on it with `npm run dev:linked` in `studio/` (the local
  source; `npm run dev` and every build use the pinned release); commit this
  site's part once a release with the shared part is installed here.
- Use only the package's entry points (`@stasiosdesign/sanity-cms`,
  `/protocol`, `/cli`); ESLint refuses deep imports. Never copy package code
  into this repository.
- Sanity is pinned too (`autoUpdates: false` in `studio/sanity.cli.ts`):
  upgrades start in the package and the stasiosdesign.com Studio.
- Local installs need npm read access to GitHub Packages (the package's
  README, "Access"); no token is ever committed.
