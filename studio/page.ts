// The Studio's page itself, which the theme (theme.ts) cannot reach. Runs as
// soon as the config loads, so the login screen gets it too:
// - the website's Adobe Fonts kit, the one src/layouts/BaseLayout.astro loads,
//   for the fonts theme.ts names;
// - the Studio's ground behind it (theme.ts, BACKGROUND): Sanity paints
//   html and body a blue-black (#13141b / #0d0e12) of its own;
// - the workspace layout (below), kept right as the Studio re-renders.
import {BACKGROUND} from './theme'

const FONTS = 'https://use.typekit.net/nqu1vih.css'

/** The Content sidebar's width: a compact column, like the reference's CMS
    Collections list. The one value for the layout below, the sidebar pane
    (structure.ts) and studio.css (--tomrow-sidebar-width, set here). */
export const SIDEBAR_WIDTH = 248

if (typeof document !== 'undefined') {
  if (!document.querySelector(`link[href="${FONTS}"]`)) {
    document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: FONTS}))
  }
  const root = document.documentElement
  root.style.setProperty('--black', '#000000')
  root.style.setProperty('--tomrow-sidebar-width', `${SIDEBAR_WIDTH}px`)
  for (const el of [root, document.body]) el?.style.setProperty('background-color', BACKGROUND)
  watchLayout()
}

/* The workspace layout, enforced on the elements themselves.

   Sanity sizes each pane with inline styles (flex, min-width, max-width;
   a dragged divider fixes a max-width for the session), so a stylesheet
   can only outrank them where its selectors match Sanity's markup exactly.
   This looks for this Studio's own markers instead (data-tomrow-sidebar,
   data-tomrow-collection, data-tomrow-document, set by the components in
   components/), walks up to the pane each one sits in, and sets that pane's
   width with priority: the sidebar is one narrow column, a collection's
   list steps aside once an item is open, and the editor takes everything
   else. It runs after every change to the page. */
function set(el: HTMLElement, styles: Record<string, string>) {
  for (const [property, value] of Object.entries(styles)) {
    if (value === '') {
      if (el.style.getPropertyValue(property)) el.style.removeProperty(property)
      continue
    }
    if (el.style.getPropertyValue(property) !== value || el.style.getPropertyPriority(property) !== 'important') {
      el.style.setProperty(property, value, 'important')
    }
  }
}

function layout() {
  const width = `${SIDEBAR_WIDTH}px`
  // Sanity wraps each pane in a column of two Flex elements under the
  // PaneLayout row, and the outer one does not grow (flex: 0 1 auto): that
  // is what left the editor short. Each column is sized by the pane it
  // holds: the first is the sidebar, the last takes everything left, and a
  // collection's list between them narrows to the sidebar's width once an
  // item is open.
  for (const row of document.querySelectorAll<HTMLElement>('[data-ui="PaneLayout"]')) {
    const columns = [...row.children].filter((c): c is HTMLElement => c instanceof HTMLElement && !!c.querySelector('[data-pane-index], [data-testid="pane"], [data-testid="document-pane"]'))
    if (columns.length < 2) continue
    set(row, {width: '100%', 'max-width': 'none'})
    columns.forEach((column, index) => {
      const pane = column.querySelector<HTMLElement>('[data-pane-index], [data-testid="pane"], [data-testid="document-pane"]')
      if (!pane) return
      const last = index === columns.length - 1
      const collapsed = pane.hasAttribute('data-pane-collapsed')
      // Everything between the column and the pane grows with it
      const chain: HTMLElement[] = [column]
      let el: HTMLElement | null = pane
      while (el && el !== column) {
        chain.push(el)
        el = el.parentElement
      }
      if (collapsed) {
        for (const item of chain) set(item, {flex: '0 0 51px', width: '51px', 'min-width': '51px', 'max-width': '51px', display: ''})
      } else if (index === 0 || pane.querySelector('[data-tomrow-collection="compact"]')) {
        for (const item of chain) set(item, {flex: `0 0 ${width}`, width, 'min-width': width, 'max-width': width, display: ''})
      } else if (last) {
        for (const item of chain) set(item, {flex: '1 1 0px', width: 'auto', 'min-width': '0px', 'max-width': 'none', display: ''})
      }
    })
  }
  // Editing always means the working draft: the Published / Draft chips go
  // (the status beside Publish Live remains; the top bar has no Drafts menu)
  for (const el of document.querySelectorAll<HTMLElement>('[data-testid="document-perspective-list"]')) {
    set(el, {display: 'none'})
  }
}

function watchLayout() {
  let scheduled = false
  const run = () => {
    scheduled = false
    layout()
  }
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(run)
  }
  const start = () => {
    schedule()
    new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'data-pane-index', 'data-pane-collapsed']})
    window.addEventListener('resize', schedule)
  }
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, {once: true})
}
