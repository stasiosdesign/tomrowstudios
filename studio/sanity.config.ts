import {defineCmsStudio} from './cms'
import {project} from './project'

// The Tomrow Studios Studio: the CMS foundation (cms/, shared by every
// website's Studio) set up for this website (project.ts: its pages,
// collections, brand, sites and integrations; schemaTypes/: its content
// model). See cms/README.md for what lives where.

if (!project.sites.preview) {
  throw new Error('SANITY_STUDIO_PREVIEW_ORIGIN is not set: see studio/.env.production and .env.development')
}

export default defineCmsStudio(project)
