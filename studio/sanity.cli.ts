import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '5cwu7mnl',
    dataset: 'production'
  },
  deployment: {
    /** The hosted Studio, https://tomrowstudios.sanity.studio (`npm run deploy`) */
    appId: 'hdannayea1d577om3omfn8cr',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
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
