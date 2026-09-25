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
   first; afterwards confirm the Vercel status on the commit. A production
   build also takes live everything published in Sanity by then, so tell the
   user first if the Studio's Go live tool lists content waiting.
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

- Content goes live in two steps: the Studio's Publish button ("Publish to
  staging") updates staging only; the Go live tool's "Publish to live site"
  rebuilds production (it writes the `liveSite` document, the only thing the
  Sanity webhook "Publish to live site" fires on). Don't make publishing
  rebuild production again.
- Every query lives in `src/sanity/queries.ts`. After changing a query or the
  schema, run `npm run typegen`.
- The hosted Studio is deployed by hand (`npm run studio:deploy`), from
  whichever branch is checked out, and serves both environments. Deploy it
  after schema or Studio changes, and keep schema changes backward-compatible
  with the code on `main` (they share one dataset).
