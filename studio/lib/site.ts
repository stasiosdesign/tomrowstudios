import {PAGES} from '../schemaTypes/pages'

/* The two sites the Studio publishes to, and where a document shows on them.
   Both addresses are public settings (studio/.env.production and
   .env.development); see the README, "Addresses". */

/** Staging: rendered on request, shows published content (drafts in draft mode) */
export const STAGING_ORIGIN = (process.env.SANITY_STUDIO_PREVIEW_ORIGIN ?? '').replace(/\/$/, '')

/** The live site: built from the live copies; empty when unset (the bar then hides its links) */
export const LIVE_ORIGIN = (process.env.SANITY_STUDIO_PRODUCTION_ORIGIN ?? '').replace(/\/$/, '')

export type Environment = 'staging' | 'live'

export const ENVIRONMENT_LABEL: Record<Environment, string> = {staging: 'staging', live: 'the live site'}

/** The document types that are collections: anything that isn't one of the fixed pages */
export const isPageType = (type: string): boolean => PAGES.some((page) => page.type === type)

/**
 * The page a document shows on, relative to a site's origin; null when it has none of its own
 * (a client shows in the home page's logo wall).
 */
export function routeFor(doc: {_type?: string; slug?: {current?: string}} | null | undefined): string | null {
  if (!doc?._type) return null
  const page = PAGES.find((entry) => entry.type === doc._type)
  if (page) return page.route
  if (doc._type === 'project') return doc.slug?.current ? `/projects/${doc.slug.current}` : null
  if (doc._type === 'client') return '/'
  return null
}

/** The site's build stamp, written by every production build (astro.config.mjs) */
export type BuildStamp = {builtAt: string; deployment: string}

export async function fetchBuildStamp(origin: string): Promise<BuildStamp | null> {
  if (!origin) return null
  try {
    const response = await fetch(`${origin}/build.json`, {cache: 'no-store'})
    if (!response.ok) return null
    const stamp = (await response.json()) as Partial<BuildStamp>
    return typeof stamp.builtAt === 'string' ? {builtAt: stamp.builtAt, deployment: stamp.deployment ?? 'production'} : null
  } catch {
    return null
  }
}
