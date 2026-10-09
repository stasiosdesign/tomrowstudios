/* The CMS foundation's public interface: everything a website's Studio may
   use. Code outside cms/ imports from here, never from a file inside
   (eslint.config.mjs enforces it), so that this directory can become a
   versioned package without the site's code changing. See README.md. */

// Building a Studio: the whole Sanity config from the site's own description
export {defineCmsStudio} from './studio'
export type {
  CmsCollection,
  CmsPage,
  CmsPageEntry,
  CmsProjectConfig,
  CollectionOptions,
  PageLink,
  RoutableDocument,
  Cms,
} from './config'
export {useCms} from './context'

// The Page editor's schema convention, and the form components a site's
// schema names: a page's sections (SectionField, or CollapsibleField for a
// lone field shown as a section) and repeatable blocks edited in place (BlockItem)
export {pageSection} from './schema'
export {CollapsibleField, SectionField} from './components/SectionField'
export {BlockItem} from './components/BlockItem'

// Interface pieces for a site's own inputs and tools, so they match the Studio
export {Collapse} from './components/Collapse'
export {ConfirmDialog} from './components/ConfirmDialog'
export {PaneHeading} from './components/PaneHeading'
export {Chip, StatusChip, type Tone} from './components/Status'
export {useInVisualEditor} from './components/PreviewControls'
