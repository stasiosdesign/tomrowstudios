import {createContext, useContext} from 'react'
import type {LayoutProps} from 'sanity'
import type {Cms} from './config'

/* The project's resolved configuration (config.ts, Cms), for every component
   of the foundation: provided around the whole Studio by its layout
   (studio.components.layout, set in studio.ts), so the top bar, the tools,
   the document panes, the form components and their dialogs all read the
   same one. */

const CmsContext = createContext<Cms | null>(null)

export function useCms(): Cms {
  const cms = useContext(CmsContext)
  if (!cms) throw new Error('useCms: the CMS foundation’s layout is missing. Build the Studio’s config with defineCmsStudio.')
  return cms
}

/** The Studio's layout: Sanity's own, inside the configuration's provider */
export function cmsLayout(cms: Cms) {
  return function CmsLayout(props: LayoutProps) {
    return <CmsContext.Provider value={cms}>{props.renderDefault(props)}</CmsContext.Provider>
  }
}
