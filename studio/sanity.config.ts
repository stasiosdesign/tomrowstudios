import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {defineDocuments, defineLocations, presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {vercelProtectionBypassTool} from '@sanity/vercel-protection-bypass'
import {DesktopIcon} from '@sanity/icons/Desktop'
import './page'
import './publish-button.css'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {theme} from './theme'

// The website the visual editor (Sanity's Presentation tool) shows, never
// production: staging from the hosted Studio (.env.production beside this
// file), your own dev server from `npm run studio` (.env.development). It opens
// the site through its draft-mode route with a short-lived secret, so the site
// renders drafts on the server (src/sanity/draft-mode/), and the click-to-edit
// layer keeps them live as they are typed (src/sanity/live-preview.ts).
const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_ORIGIN
if (!previewOrigin) {
  throw new Error('SANITY_STUDIO_PREVIEW_ORIGIN is not set: see studio/.env.production and .env.development')
}

// One fixed document each: never created from the menu, duplicated or deleted
const SINGLETONS = new Set(['homePage'])

export default defineConfig({
  name: 'default',
  title: 'Tomrow Studios',

  projectId: '5cwu7mnl',
  dataset: 'production',

  // The website's fonts on a pure black ground (theme.ts; page.ts loads the
  // fonts and blacks out the page behind the Studio). The Publish button is
  // the site's red call to action (publish-button.css).
  theme,

  // The visual editor comes first, so the Studio opens on it: the home page,
  // with its form beside it. Content is the same documents as plain forms.
  plugins: [
    presentationTool({
      title: 'Visual editor',
      icon: DesktopIcon,
      previewUrl: {
        initial: previewOrigin,
        previewMode: {enable: '/api/draft-mode/enable'},
      },
      resolve: {
        mainDocuments: defineDocuments([{route: '/', filter: `_id == "homePage"`}]),
        // Where else a document shows, listed above its form. The Home page
        // has none: it is the page the visual editor opens on.
        locations: {
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
    structureTool({structure, title: 'Content'}),
    visionTool(),
    // Staging sits behind Vercel Authentication. This tool stores Vercel's
    // "Protection Bypass for Automation" secret in the dataset (a private
    // document), and the visual editor then adds it to the staging URLs it
    // opens. Only needed to set that secret; see the README.
    vercelProtectionBypassTool(),
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
