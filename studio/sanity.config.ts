import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {defineDocuments, defineLocations, presentationTool} from 'sanity/presentation'
import {vercelProtectionBypassTool} from '@sanity/vercel-protection-bypass'
import {DesktopIcon} from '@sanity/icons/Desktop'
import './page'
import './studio.css'
import {DocumentLayout} from './components/DocumentLayout'
import {schemaTypes} from './schemaTypes'
import {PAGES} from './schemaTypes/pages'
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

// The fixed pages: one document each, never created from the menu, duplicated
// or deleted. Its ID is its type (structure.ts opens that one document).
const SINGLETONS = new Set(PAGES.map((page) => page.type))

// Clients are edited from the Home page's logo wall, never made from the menu
const HIDDEN_FROM_NEW = new Set([...SINGLETONS, 'client'])

// The tools an editor sees: the Visual editor and Content. The Vercel bypass
// tool stays installed (its secret lets the visual editor through Vercel's
// authentication on staging) but is reached by its URL alone, /vercel-protection-bypass.
const VISIBLE_TOOLS = new Set(['presentation', 'structure'])

export default defineConfig({
  name: 'default',
  title: 'Tomrow Studios',

  projectId: '5cwu7mnl',
  // The dataset the Studio edits. The live site reads `production`, which
  // only Publish Live writes to (src/sanity/publish/, studio/lib/publish.ts).
  dataset: 'staging',

  // The website's fonts on a pure black ground (theme.ts; page.ts loads the
  // fonts and blacks out the page behind the Studio). studio.css sets the
  // rest: the red Publish button, hover and selection, tables, the sidebar.
  theme,

  // Content first, so the Studio opens on it: the Page editor and the CMS
  // collections (structure.ts). The Visual editor shows the same documents
  // beside the page they make.
  plugins: [
    structureTool({structure, title: 'Content'}),
    presentationTool({
      title: 'Visual editor',
      icon: DesktopIcon,
      previewUrl: {
        initial: previewOrigin,
        previewMode: {enable: '/api/draft-mode/enable'},
      },
      resolve: {
        // Each page's route opens its document beside the preview
        mainDocuments: defineDocuments([
          ...PAGES.map((page) => ({route: page.route, filter: `_id == "${page.type}"`})),
          {route: '/projects/:slug', filter: `_type == "project" && slug.current == $slug`},
          {route: '/:slug', filter: `_type == "shopItem" && slug.current == $slug`},
        ]),
        // Where else a document shows, listed above its form. The pages have
        // none: each is the page the visual editor is looking at.
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
          shopItem: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: [
                {title: doc?.title || 'Untitled', href: `/${doc?.slug}`},
                {title: 'Shop', href: '/shop'},
              ],
            }),
          }),
          partner: defineLocations({locations: [{title: 'Partners', href: '/partner'}, {title: 'Partners archive', href: '/partners-archive'}]}),
          client: defineLocations({locations: [{title: 'Home (logo wall)', href: '/'}]}),
        },
      },
    }),
    // Staging sits behind Vercel Authentication. This tool stores Vercel's
    // "Protection Bypass for Automation" secret in the dataset (a private
    // document); the visual editor and the publishing route then add it to
    // the staging URLs they open. Hidden from the menu (VISIBLE_TOOLS).
    vercelProtectionBypassTool(),
  ],

  tools: (tools) => tools.filter((tool) => VISIBLE_TOOLS.has(tool.name)),

  // Content releases are not part of this workflow: staging and live are
  // datasets, not releases
  releases: {enabled: false},

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({schemaType}) => !HIDDEN_FROM_NEW.has(schemaType)),
  },

  document: {
    // Sanity's Publish button and its menu are replaced by the publishing
    // control (components/PublishControls.tsx), which knows about staging
    // and the live site
    actions: () => [],
    components: {
      unstable_layout: DocumentLayout,
    },
  },
})
