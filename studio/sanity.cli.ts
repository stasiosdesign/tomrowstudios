import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '5cwu7mnl',
    dataset: 'production'
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
  /**
   * Types for the website's GROQ queries, written into the Astro app at the
   * repository root. `npm run typegen` refreshes them; `sanity dev` and
   * `sanity build` also do, as the schema changes.
   */
  typegen: {
    enabled: true,
    path: '../src/**/*.{ts,astro}',
    schema: 'schema.json',
    generates: '../src/sanity/sanity.types.ts',
    overloadClientMethods: true,
  },
})
