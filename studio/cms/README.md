# CMS foundation (`studio/cms/`)

The custom Sanity Studio every website's Studio is built on: Content (the
Page editor and the CMS collections), the Visual editor, the publishing
control, the top bar and the design system. It lives in the Tomrow Studios
repository for now and is written to leave it unchanged: as a versioned
package (`@stasiosdesign/sanity-cms`, `package.json` beside this file), developed
in a standalone template Studio and consumed by each client's Studio.

A website's Studio is the foundation plus the website's own description of
itself:

```ts
// studio/sanity.config.ts
import {defineCmsStudio} from './cms'           // later: '@stasiosdesign/sanity-cms'
import {project} from './project'
export default defineCmsStudio(project)
```

## What lives where

| Shared: `cms/` | The website: everything else in `studio/` |
| --- | --- |
| `studio.ts`: `defineCmsStudio`, the whole Sanity config: tools, top bar, document layout, form layout, document actions, releases/tasks/comments off | `project.ts`: projectId, dataset, brand, site addresses (from its `.env*`), pages, Page editor entries, collections, routes, Visual editor routes and locations, its own plugins |
| `config.ts`: the typed contract (`CmsProjectConfig`) and its resolved form (`Cms`, read with `useCms()`) | `schemaTypes/`: every document, page and object type, field, reference and validation |
| `structure.ts`: the Content tool: sidebar, Overview, Page editor, collection panes | `components/`: the website's own components (its Studio icon; later, bespoke inputs such as a map editor) |
| `components/`: collection tables, publishing control and progress, navbar, Visual editor controls, CMS item prompt, page sections, blocks, dialogs, chips | `static/`, `scripts/` (seeds and migrations), `sanity.cli.ts` (appId, typegen paths) |
| `lib/`: publishing client, status rules, run stages, live reads (tested: `npm test`) | The website's side of the contract below (`src/sanity/` in this repository) |
| `theme.ts`, `studio.css`, `page.ts`: the design system and workspace layout | |
| `schema.ts`: `pageSection`, the Page editor's schema convention | |

The boundary is enforced, not just documented (`studio/eslint.config.mjs`,
run by `npm run check`): nothing in `cms/` imports from outside it or reads
`process.env`, and nothing outside imports a file inside `cms/` other than
its `index.ts`.

## Extension points

Everything a website supplies is in `CmsProjectConfig` (`config.ts`, typed):

| Need | Where |
| --- | --- |
| Sanity project, dataset, sites | `projectId`, `dataset`, `sites.preview` / `sites.live` (read from the site's own env in its `project.ts`) |
| Brand | `brand`: title, icon, font (family + stylesheet), accent (base/hover/pressed) |
| Schemas and references | `schema.types` (plain Sanity types); `schema.hiddenFromNew` for types made elsewhere |
| Pages | `pages` (singletons, ID = type, with their routes) and `pageEditor` (the sidebar's order, names, card descriptions). Page schemas use `pageSection(...)` for each section |
| Collections | `collections`: type, names, name/order fields, icon, description, the page that lists it |
| Page and item routes | `pages[].route`, `documentRoute(doc)` for everything else |
| Visual editing | `visualEditor.mainDocuments`, `visualEditor.locations`, `visualEditor.previewModeEnable` |
| Publishing | `publishing.route`, `publishing.datasets` |
| Custom fields, inputs, component editors | In the website's schema (`components: {input: MapEditor}`), built from the exported pieces (`Collapse`, `ConfirmDialog`, `PaneHeading`, `Chip`, `StatusChip`, `BlockItem`, `SectionField`, `useInVisualEditor`, `useCms`) and the `--tomrow-*` CSS tokens |
| Anything else | `plugins`: Sanity plugins (`definePlugin`) for the website's own tools, document types, integrations; `tools` to show a plugin's tool in the top bar |

Add an extension point when a second website genuinely needs one, not
before. Shared code never branches on a website's types or names.

## What a website must provide (the frontend contract)

The shared publishing and Visual editor features assume the website has:

- two datasets: `staging` (edited by the Studio, read by staging and the
  Visual editor) and `production` (read only by the live site);
- `POST /api/publish` on staging (`src/sanity/publish/`): the request and
  streamed response `lib/publish.ts` speaks, `publish-log.*` notes, and a
  `contentKey` identical to `lib/status.ts`;
- the draft-mode route (`/api/draft-mode/enable`) and the visual-editing
  layer on staging (`src/sanity/draft-mode/`, `src/sanity/live-preview.ts`),
  which also answers the `tomrow/show-section` message;
- `/build.json` on the live site (`astro.config.mjs`), for the rebuild stage.

That code lives in the website today (see "Still coupled").

## The standalone template Studio (later)

1. Create a repository for the package with this directory at its root
   (`git subtree split --prefix=studio/cms` keeps its history), adding a
   build step only if the Studios need one (Sanity's Vite compiles TS/TSX
   and CSS from a dependency; verify with the first consumer).
2. Add `template/` beside it: a Studio whose `sanity.config.ts` is
   `defineCmsStudio(templateProject)`, importing the package source through
   a workspace link, so it always runs the code being changed.
3. Give it its own Sanity project with `staging` and `production` datasets
   and dummy content kept as fixtures (an `.ndjson` in the repo, loaded with
   `sanity dataset import`), modelled on the real Studios: several pages
   made of `pageSection`s, two or three collections with references,
   repeatable blocks, images, rich text.
4. Give it a small preview site (or a stub) implementing the contract above,
   so the Visual editor and publishing run end to end on dummy data.

## Versioning and updates across five Studios

- **Release.** Semver tags on the package repository, published to a private
  registry (GitHub Packages) by CI on tag. Patch: fixes; minor: new features
  and new optional config; major: anything a website must change (a
  required config field, the publishing route's protocol, a schema
  convention). A changelog entry with every release (Changesets).
- **Before releasing.** In the template: `tsc`, ESLint, `npm test`,
  `sanity build`, and a look at the dummy Studio; screenshot tests later if
  visual regressions become a problem.
- **Updating a website.** Each client Studio depends on the package by
  version (`^1.4.0`). Renovate (or Dependabot) opens a pull request in every
  client repository when a release lands; CI there runs the same checks
  against that website's own schema and config (TypeScript catches a
  changed contract); merge to `staging`, review on the staging Studio, then
  promote. Websites' schemas, editors, data and integrations are untouched
  by an update: they live outside the package.
- **Sanity itself.** The design system and layout rely on Sanity's markup
  (test IDs, `data-ui`), so Sanity versions should move in the template
  first. `autoUpdates: true` (`sanity.cli.ts`) lets the hosted Studios run a
  newer Sanity than the one tested (6.18 hosted vs 6.16 here at the time of
  writing); for five Studios, turn it off and upgrade Sanity through the
  package's `peerDependencies`.
- **Contract changes** (`/api/publish`, `show-section`): change both sides in
  one major release, keeping the route able to answer the previous version
  until every Studio has updated, as `lib/publish.ts` already reads an older
  route's one-piece answer.

## Still coupled to this website

- **The `tomrow` prefix**: CSS variables (`--tomrow-*`), data attributes,
  dropdown IDs, the `tomrow-cta` class, `localStorage` keys
  (`tomrow.columns.*`, `tomrow.search.*`, `tomrow.sidebar.*`) and the
  `tomrow/show-section` message. Harmless for reuse, but rename to a neutral
  prefix at extraction, migrating the stored keys and changing the site's
  listener in the same release.
- **The website side of publishing and visual editing** lives in the Astro
  site: `src/sanity/publish/index.ts` (with its own copy of `contentKey` and
  a hard-coded Studio origin list), `src/sanity/draft-mode/`,
  `src/sanity/live-preview.ts`. Extract the route and the draft-mode
  handlers into a server entry of the package (framework-neutral request →
  response) before a second website needs them.
- **Wording** assumes this workflow and site: "Publish Site", "Staging
  link", and two messages pointing to "the Sanity webhook (README)"
  (`components/PublishControls.tsx`, `lib/run.ts`), a reference to this
  repository's README.
- **The Vercel bypass**: `lib/publish.ts` reads the secret the Vercel
  protection-bypass tool stores (harmless when absent); the tool itself is
  the website's (`project.ts`, `plugins`).
- **CSS from a package**: `studio.ts` imports `studio.css`; confirm the
  Sanity build includes it when the foundation comes from `node_modules`.
