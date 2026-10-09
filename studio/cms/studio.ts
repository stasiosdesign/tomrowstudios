import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {defineDocuments, presentationTool} from 'sanity/presentation'
import {DesktopIcon} from '@sanity/icons/Desktop'
import './studio.css'
import {DocumentLayout} from './components/DocumentLayout'
import {FieldLayout} from './components/FieldLayout'
import {PageInput} from './components/PageInput'
import {PaneTitle} from './components/PaneTitle'
import {PreviewControls, PreviewHeaderBridge} from './components/PreviewControls'
import {SectionsToggle} from './components/Sections'
import {StudioNavbar} from './components/StudioNavbar'
import {resolveCms, type CmsProjectConfig} from './config'
import {cmsLayout} from './context'
import {installStudioPage} from './page'
import {createStructure} from './structure'
import {createStudioTheme} from './theme'

/* A website's Studio, built on the CMS foundation: the whole Sanity config,
   from the site's own description of itself (config.ts, CmsProjectConfig).
   A site's sanity.config.ts is `export default defineCmsStudio({...})`.

   What the foundation decides, the same for every site: Content (the Page
   editor and the CMS collections) and the Visual editor as the two tools,
   with the top bar, the document layout and the publishing control in place
   of Sanity's own; the form's page and field layout; the theme. What the
   site decides comes from its config, and its own features join as plugins
   (project.plugins), Sanity's own way of adding to a Studio. */

// The tools an editor sees: the Visual editor and Content. Any other (the
// site's own, or one installed for an integration, like the Vercel bypass)
// is reached by its URL alone, unless the site lists it (project.tools).
const FOUNDATION_TOOLS = ['presentation', 'structure']

export function defineCmsStudio(project: CmsProjectConfig) {
  if (!project.sites.preview) {
    throw new Error('defineCmsStudio: sites.preview, the staging site the Visual editor shows, is not set')
  }
  const cms = resolveCms(project)
  installStudioPage({fontStylesheet: project.brand.font?.stylesheet, accent: project.brand.accent.base})

  // The fixed pages: one document each, never created from the menu,
  // duplicated or deleted. Its ID is its type (structure.ts opens that one
  // document). Nor is any type the site keeps out of New.
  const hiddenFromNew = new Set([...cms.pages.map((page) => page.type), ...(project.schema.hiddenFromNew ?? [])])
  const visibleTools = new Set([...FOUNDATION_TOOLS, ...(project.tools ?? [])])
  const visualEditor = project.visualEditor ?? {}

  return defineConfig({
    name: project.name ?? 'default',
    title: project.brand.title,
    // The site's icon, wherever Sanity shows the Studio's icon (the top bar,
    // components/StudioNavbar.tsx, shows it beside "CMS")
    icon: project.brand.icon,

    projectId: project.projectId,
    // The dataset the Studio edits. The live site reads the production
    // dataset, which only the publishing route writes to (lib/publish.ts).
    dataset: project.dataset,

    // The site's typeface on a near-black ground (theme.ts; page.ts loads the
    // font and blacks out the page behind the Studio). studio.css sets the
    // rest: the accent Publish button, hover and selection, tables, the sidebar.
    theme: createStudioTheme({fontFamily: project.brand.font?.family, accent: project.brand.accent}),

    // Content first, so the Studio opens on it: the Page editor and the CMS
    // collections (structure.ts). The Visual editor shows the same documents
    // beside the page they make. Then the site's own plugins.
    plugins: [
      structureTool({structure: createStructure(cms), title: 'Content'}),
      presentationTool({
        title: 'Visual Editor',
        icon: DesktopIcon,
        // No bar above the preview: its Edit switch and phone view move into
        // the side panel's header row (components/PreviewControls.tsx), and the
        // website gets the height
        components: {unstable_header: {component: PreviewHeaderBridge}},
        // The site opens through its draft-mode route with a short-lived
        // secret, so it renders drafts on the server
        previewUrl: {
          initial: cms.sites.preview,
          previewMode: {enable: visualEditor.previewModeEnable ?? '/api/draft-mode/enable'},
        },
        resolve: {
          // Each page's route opens its document beside the preview, then the site's own
          mainDocuments: defineDocuments([
            ...cms.pages.map((page) => ({route: page.route, filter: `_id == "${page.type}"`})),
            ...(visualEditor.mainDocuments ?? []),
          ]),
          // Where else a document shows, listed above its form. The pages have
          // none: each is the page the visual editor is looking at.
          locations: visualEditor.locations ?? {},
        },
      }),
      ...(project.plugins ?? []),
    ],

    tools: (tools) => tools.filter((tool) => visibleTools.has(tool.name)),

    studio: {
      components: {
        // Every component of the foundation reads the site's config from here (context.tsx)
        layout: cmsLayout(cms),
        // The top bar, one row like Linear's: the site's icon and "CMS" (the
        // project menu), the open tool's name, and the Content / Visual
        // editor switch (components/StudioNavbar.tsx, in place of Sanity's own bar)
        navbar: StudioNavbar,
      },
    },

    // Content releases are not part of this workflow: staging and live are
    // datasets, not releases
    releases: {enabled: false},

    // Nor are Sanity's tasks: the top bar drops its Tasks button
    tasks: {enabled: false},

    // The static pages' form: their sections as one ruled list (PageInput).
    // Every form: small fields share a row on a wide pane (FieldLayout).
    form: {
      components: {
        input: PageInput,
        field: FieldLayout,
      },
    },

    schema: {
      types: project.schema.types,
      templates: (templates) => templates.filter(({schemaType}) => !hiddenFromNew.has(schemaType)),
    },

    document: {
      // Sanity's Publish button and its menu are replaced by the publishing
      // control (components/PublishControls.tsx), which knows about staging
      // and the live site
      actions: () => [],
      // No comments: the pages and the CMS items are edited, not discussed here
      comments: {enabled: false},
      // Sanity's slot for controls in a document's header row: a document's
      // title in Content, the preview's Edit switch and views in the Visual
      // editor, and Expand all / Collapse all where the document has sections
      // that fold. Each draws nothing elsewhere.
      unstable_languageFilter: (prev) => [...prev, PaneTitle, PreviewControls, SectionsToggle],
      // No "Open in Content" in the Visual editor's header row: the Presentation
      // tool's own action, which shows nowhere else. Content keeps its navigation.
      unstable_fieldActions: (prev) => prev.filter((action) => action.name !== 'presentation/openInStructure'),
      components: {
        unstable_layout: DocumentLayout,
      },
    },
  })
}
