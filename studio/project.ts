import {BasketIcon} from '@sanity/icons/Basket'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {UsersIcon} from '@sanity/icons/Users'
import {defineLocations} from 'sanity/presentation'
import {vercelProtectionBypassTool} from '@sanity/vercel-protection-bypass'
import type {CmsProjectConfig} from './cms'
import {StudioIcon} from './components/StudioIcon'
import {schemaTypes} from './schemaTypes'
import {PAGES} from './schemaTypes/pages'

/* Everything the CMS foundation (cms/) needs to know about the Tomrow Studios
   website: its Sanity project, its brand, its two sites, its content model,
   and how the Studio's Visual editor and publishing reach it. The foundation
   builds the Studio from this (sanity.config.ts); nothing in cms/ knows about
   this site otherwise. */

// The site the Visual editor (Sanity's Presentation tool) shows, never
// production: staging from the hosted Studio (.env.production beside this
// file), your own dev server from `npm run studio` (.env.development). It
// opens the site through its draft-mode route with a short-lived secret, so
// the site renders drafts on the server (src/sanity/draft-mode/), and the
// click-to-edit layer keeps them live as they are typed
// (src/sanity/live-preview.ts). The same address the publishing control
// sends its actions to (src/sanity/publish/). See the README, "Addresses".
const PREVIEW_ORIGIN = process.env.SANITY_STUDIO_PREVIEW_ORIGIN ?? ''

// The live site: the publishing menu's links and the build stamp it watches
// (/build.json, written by every production build, astro.config.mjs)
const LIVE_ORIGIN = process.env.SANITY_STUDIO_PRODUCTION_ORIGIN ?? ''

export const project: CmsProjectConfig = {
  projectId: '5cwu7mnl',
  // The dataset the Studio edits. The live site reads `production`, which
  // only Publish Live writes to (src/sanity/publish/).
  dataset: 'staging',

  brand: {
    title: 'Tomrow Studios',
    // The website's favicon, wherever Sanity shows the Studio's icon
    icon: StudioIcon,
    // The website's Adobe Fonts kit, the one src/layouts/BaseLayout.astro loads
    font: {family: '"inter-tight-variable", sans-serif', stylesheet: 'https://use.typekit.net/nqu1vih.css'},
    // The site's one red (--cta-accent-color in src/styles/style.css)
    accent: {base: '#dd341d', hover: '#e45442', pressed: '#c22e1a'},
  },

  sites: {preview: PREVIEW_ORIGIN, live: LIVE_ORIGIN},

  schema: {
    types: schemaTypes,
    // Clients are edited from the Home page's logo wall, never made from the menu
    hiddenFromNew: ['client'],
  },

  // The static pages (schemaTypes/pages): in the site's navigation order
  pages: PAGES,

  // The Page editor's list: its order, its names, and each page's card on the
  // overview. The Architecture page is here; the projects on it are not.
  pageEditor: [
    {type: 'homePage', title: 'Home', description: 'The hero, client logos, photo slider, recognition and galleries.'},
    {type: 'influencePage', title: 'Influence', description: 'The opening, reach figures, approach, origins, insights and the book.'},
    {type: 'architecturePage', title: 'Architectural', description: 'The header above the projects, which are a collection.'},
    {type: 'shopPage', title: 'Shop', description: 'The opening, catalogue heading, testimonials and FAQ.'},
    {type: 'partnersPage', title: 'Partner', description: 'The opening, clients, services, results and enquiry.'},
    {type: 'privacyPage', title: 'Privacy policy', description: 'The privacy policy: its heading and text.'},
    {type: 'termsPage', title: 'Terms of use', description: 'The terms of use: their heading and text.'},
  ],

  // The CMS collections, in the sidebar's order. Clients are edited from the
  // Home page's logo wall and have no collection.
  collections: [
    {
      type: 'project',
      title: 'Projects',
      singular: 'project',
      nameField: 'title',
      orderField: 'sortOrder',
      icon: ProjectsIcon,
      description: 'The architecture projects: the Architecture slider and each project’s page.',
      listedOn: 'architecturePage',
    },
    {
      type: 'shopItem',
      title: 'Shop',
      singular: 'item',
      nameField: 'title',
      orderField: 'sortOrder',
      icon: BasketIcon,
      description: 'The products, each with its own page in the shop.',
      listedOn: 'shopPage',
    },
    {
      type: 'partner',
      title: 'Partners',
      singular: 'partner',
      nameField: 'name',
      orderField: 'sortOrder',
      icon: UsersIcon,
      description: 'Partner case studies, on the Partners page and its archive.',
      listedOn: 'partnersPage',
    },
  ],

  // The page each kind of CMS item shows on (a client shows in the home
  // page's logo wall)
  documentRoute(doc) {
    const slug = doc.slug?.current
    if (doc._type === 'project') return slug ? `/projects/${slug}` : null
    if (doc._type === 'shopItem') return slug ? `/${slug}` : null
    if (doc._type === 'partner') return '/partner'
    if (doc._type === 'client') return '/'
    return null
  },

  visualEditor: {
    // A project's and a shop item's own pages open the item beside the preview
    mainDocuments: [
      {route: '/projects/:slug', filter: `_type == "project" && slug.current == $slug`},
      {route: '/:slug', filter: `_type == "shopItem" && slug.current == $slug`},
    ],
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

  plugins: [
    // Staging sits behind Vercel Authentication. This tool stores Vercel's
    // "Protection Bypass for Automation" secret in the dataset (a private
    // document); the visual editor and the publishing route then add it to
    // the staging URLs they open. Hidden from the top bar, reached by its URL
    // alone: /vercel-protection-bypass.
    vercelProtectionBypassTool(),
  ],
}
