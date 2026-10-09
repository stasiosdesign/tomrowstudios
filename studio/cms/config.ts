import {DocumentIcon} from '@sanity/icons/Document'
import type {ComponentType} from 'react'
import type {PluginOptions, SchemaTypeDefinition} from 'sanity'
import type {DocumentLocationResolvers, DocumentResolver} from 'sanity/presentation'
import {DEFAULT_DATASETS, type Datasets} from './lib/publish'

/* The contract between the CMS foundation (this directory, studio/cms/) and
   the website it is set up for (everything outside it). A website's Studio
   describes itself once, as a CmsProjectConfig, and hands it to
   defineCmsStudio (studio.ts); everything the foundation needs to know about
   the site comes from here, and nothing in cms/ imports the site's own code.

   The components read the resolved form, Cms (below), through useCms()
   (context.tsx); the structure, the Visual editor's routes and the
   publishing calls are built from it. See README.md beside this file. */

/** A static page: one singleton document whose _id is its type, at a fixed address on the site */
export type CmsPage = {
  /** Its document type, which is also its document's ID */
  type: string
  /** Its name on the site (the publishing control's per-page statuses use it) */
  title: string
  /** Its address on the site, relative to the site's origin */
  route: string
}

/** A page's entry in the Page editor: the Content sidebar, its overview card, the Visual editor's page menu */
export type CmsPageEntry = {
  /** One of the pages' types */
  type: string
  /** Its name in the Page editor */
  title: string
  /** What it holds, for its card on the overview */
  description: string
}

/** A CMS collection's table (CollectionPane) */
export type CollectionOptions = {
  /** The document type */
  type: string
  /** The collection's name, e.g. "Projects" */
  title: string
  /** One item, e.g. "project" */
  singular: string
  /** The field that names an item: title or name */
  nameField: string
  /** The field the collection is ordered by, if it has one */
  orderField?: string
}

/** A CMS collection: its table's options, its icon, its card's description, and the page that lists its items on the site (where the Visual editor goes back to from one of them) */
export type CmsCollection = CollectionOptions & {icon: ComponentType; description: string; listedOn: string}

/** A document that isn't a page, as documentRoute is given it */
export type RoutableDocument = {_type: string; slug?: {current?: string}}

export type CmsProjectConfig = {
  /** The workspace's name (Sanity's `name`); "default" when there is one */
  name?: string
  projectId: string
  /** The dataset the Studio edits: the staging dataset (publishing.datasets) */
  dataset: string

  /** How the Studio is branded for this site */
  brand: {
    /** The Studio's name: the project menu, the overview's heading, the browser tab */
    title: string
    /** The Studio's icon: the top bar, and wherever Sanity shows it */
    icon: ComponentType
    /** The site's typeface, as a CSS font-family list, and the stylesheet that loads it (Adobe Fonts, Google Fonts) */
    font?: {family: string; stylesheet?: string}
    /** The site's accent: the Publish button and destructive buttons, with its hovered and pressed shades */
    accent: {base: string; hover: string; pressed: string}
  }

  /** The two deployments of the site: public addresses, no trailing slash needed */
  sites: {
    /** Staging: the Visual editor's preview, and the host of the publishing route */
    preview: string
    /** The live site: its links and its build stamp (/build.json); empty hides both */
    live?: string
  }

  schema: {
    /** Every document and object type of the site */
    types: SchemaTypeDefinition[]
    /** Document types never offered under "New" (the pages never are) */
    hiddenFromNew?: string[]
  }

  /** The static pages, in the site's order. Each is a singleton: never created from the menu, duplicated or deleted. */
  pages: CmsPage[]
  /** The Page editor's list of those pages, in its own order and with its own names */
  pageEditor: CmsPageEntry[]
  /** The CMS collections, in the sidebar's order. The first is the fallback type for an intent that names none. */
  collections: CmsCollection[]

  /** Where a document that isn't a page shows on the site (a path), or null: the publishing menu's site links */
  documentRoute?: (doc: RoutableDocument) => string | null

  /** The Visual editor's link to the site */
  visualEditor?: {
    /** The site's draft-mode route, which the preview opens through (default /api/draft-mode/enable) */
    previewModeEnable?: string
    /** Routes that open a document beside the preview; each page's own route is added for it */
    mainDocuments?: DocumentResolver[]
    /** Where else a document shows, listed above its form (the pages need none) */
    locations?: DocumentLocationResolvers
  }

  publishing?: {
    /** The publishing route on the staging site (default /api/publish) */
    route?: string
    /** The dataset the Studio edits and the one only the live site reads (default staging / production) */
    datasets?: Datasets
  }

  /** The site's own Sanity plugins: bespoke tools, inputs, document actions, integrations */
  plugins?: PluginOptions[]
  /** Tools besides Content and the Visual editor to show in the top bar (by name); any other is reached by its URL alone */
  tools?: string[]
}

/** A page as the Studio links to it: the Page editor's name and order, the page's icon and address */
export type PageLink = {type: string; title: string; icon: ComponentType; route: string}

/** The project's configuration, resolved: what the foundation's components read (useCms) */
export type Cms = {
  config: CmsProjectConfig
  brand: CmsProjectConfig['brand']
  /** The two sites' origins, without a trailing slash; live is '' when unset */
  sites: {preview: string; live: string}
  /** The static pages, in the site's order */
  pages: CmsPage[]
  /** The Page editor's entries, each with its page's icon */
  pageEditor: (CmsPageEntry & {icon: ComponentType})[]
  /** The pages as the Studio links to them, in the Page editor's order */
  pageLinks: PageLink[]
  /** The collections whose type is in the schema */
  collections: CmsCollection[]
  datasets: Datasets
  /** The publishing route's full address */
  publishEndpoint: string
  /** Whether a type is one of the static pages */
  isPage: (type: string) => boolean
  /** The page a document shows on, relative to a site's origin; null when it has none of its own */
  routeFor: (doc: {_type?: string; slug?: {current?: string}} | null | undefined) => string | null
}

const trimOrigin = (origin: string | undefined) => (origin ?? '').replace(/\/$/, '')

export function resolveCms(config: CmsProjectConfig): Cms {
  const {pages, schema} = config
  const iconOf = (type: string): ComponentType | undefined =>
    (schema.types.find((schemaType) => schemaType.name === type) as {icon?: ComponentType} | undefined)?.icon
  const isPage = (type: string): boolean => pages.some((page) => page.type === type)

  const pageEditor = config.pageEditor
    .filter((item) => isPage(item.type))
    .map((item) => ({...item, icon: iconOf(item.type) ?? DocumentIcon}))
  const sites = {preview: trimOrigin(config.sites.preview), live: trimOrigin(config.sites.live)}

  return {
    config,
    brand: config.brand,
    sites,
    pages,
    pageEditor,
    pageLinks: pageEditor.map((item) => ({
      type: item.type,
      title: item.title,
      icon: item.icon,
      route: pages.find((page) => page.type === item.type)?.route ?? '/',
    })),
    collections: config.collections.filter((collection) => schema.types.some((schemaType) => schemaType.name === collection.type)),
    datasets: config.publishing?.datasets ?? DEFAULT_DATASETS,
    publishEndpoint: sites.preview ? new URL(config.publishing?.route ?? '/api/publish', sites.preview).toString() : '',
    isPage,
    routeFor(doc) {
      if (!doc?._type) return null
      const page = pages.find((entry) => entry.type === doc._type)
      if (page) return page.route
      return config.documentRoute?.({_type: doc._type, slug: doc.slug}) ?? null
    },
  }
}
