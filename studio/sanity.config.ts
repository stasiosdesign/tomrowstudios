import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {defineDocuments, defineLocations, presentationTool} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {DesktopIcon} from '@sanity/icons/Desktop'
import './page'
import './publish-button.css'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {theme} from './theme'

// The website the visual editor (Sanity's Presentation tool) shows: the live
// site from the hosted Studio, your own dev server (npm run dev, port 8766)
// from a local one; SANITY_STUDIO_PREVIEW_ORIGIN overrides both. Framed here,
// the site loads its click-to-edit layer and takes drafts from the Studio in
// live mode (src/sanity/live-preview.ts), so no preview deployment or token is
// needed.
const LIVE_SITE = 'https://tomrowstudios-final-wireframes.vercel.app'
const LOCAL_SITE = 'http://localhost:8766'
const previewOrigin = ({origin}: {origin: string}) =>
  process.env.SANITY_STUDIO_PREVIEW_ORIGIN ||
  (new URL(origin).hostname === 'localhost' ? LOCAL_SITE : LIVE_SITE)

// One fixed document each: never created from the menu, duplicated or deleted
const SINGLETONS = new Set(['homePage'])

export default defineConfig({
  name: 'default',
  title: 'tomrowstudios',

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
      previewUrl: {initial: previewOrigin},
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
