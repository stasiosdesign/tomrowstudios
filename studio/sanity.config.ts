import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {defineDocuments, defineLocations, presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

// The website the Presentation tool shows, with click-to-edit on the home hero:
// the hosted preview (a Vercel project built with visual editing on) from the
// hosted Studio, your own dev server (npm run dev, port 8766) from a local one.
// SANITY_STUDIO_PREVIEW_ORIGIN overrides both.
const HOSTED_PREVIEW = 'https://tomrowstudios-preview.vercel.app'
const LOCAL_PREVIEW = 'http://localhost:8766'
const previewOrigin = ({origin}: {origin: string}) =>
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN ||
  (new URL(origin).hostname === 'localhost' ? LOCAL_PREVIEW : HOSTED_PREVIEW)

// One fixed document each: never created from the menu, duplicated or deleted
const SINGLETONS = new Set(['homePage'])

export default defineConfig({
  name: 'default',
  title: 'tomrowstudios',

  projectId: '5cwu7mnl',
  dataset: 'production',

  plugins: [
    structureTool({structure}),
    presentationTool({
      previewUrl: {
        initial: previewOrigin,
        previewMode: {enable: '/api/draft-mode/enable', disable: '/api/draft-mode/disable'},
      },
      resolve: {
        mainDocuments: defineDocuments([{route: '/', filter: `_id == "homePage"`}]),
        locations: {
          homePage: defineLocations({
            locations: [{title: 'Home', href: '/'}],
            message: 'The hero at the top of the home page',
          }),
          project: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: [
                {title: doc?.title || 'Untitled', href: `/projects/${doc?.slug}`},
                {title: 'Architecture', href: '/architecture'},
              ],
            }),
          }),
          client: defineLocations({locations: [{title: 'Home (logo wall)', href: '/'}]}),
        },
      },
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({schemaType}) => !SINGLETONS.has(schemaType)),
  },

  document: {
    actions: (actions, {schemaType}) =>
      SINGLETONS.has(schemaType)
        ? actions.filter(({action}) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : actions,
  },
})
