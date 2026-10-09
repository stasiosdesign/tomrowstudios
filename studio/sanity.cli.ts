import {defineCliConfig} from 'sanity/cli'
import {linkLocalCms} from '@stasiosdesign/sanity-cms/cli'

export default defineCliConfig({
  api: {
    projectId: '5cwu7mnl',
    // The dataset the Studio edits. The live site's is `production`, written
    // only by the Studio's Publish Live (see the README, "Content").
    dataset: 'staging',
  },
  deployment: {
    /** The hosted Studio, https://tomrowstudios.sanity.studio (`npm run deploy`) */
    appId: 'hdannayea1d577om3omfn8cr',
    /**
     * Off: the hosted Studio runs exactly the Sanity version package-lock.json
     * pins, the one the CMS package was tested with, not whatever Sanity
     * publishes next. Sanity upgrades are deliberate (CLAUDE.md, "The CMS").
     */
    autoUpdates: false,
  },
  /**
   * `npm run dev:linked` runs the Studio on a local checkout of the CMS
   * package (../../sanity-cms) instead of its installed release, to work on a
   * change that needs both sides. `npm run dev`, builds and deploys always use
   * the release package-lock.json pins.
   */
  vite: linkLocalCms({scripts: ['dev:linked']}),
  /**
   * Types for the website's GROQ queries, written into the Astro app at the
   * repository root. Every query the site runs is in src/sanity/queries.ts.
   * `npm run typegen` refreshes them; `sanity dev` and `sanity build` also do,
   * as the schema changes.
   */
  typegen: {
    enabled: true,
    path: '../src/sanity/queries.ts',
    schema: 'schema.json',
    generates: '../src/sanity/sanity.types.ts',
    overloadClientMethods: true,
  },
})
