// The Studio's page itself, which the theme (theme.ts) cannot reach. Runs as
// soon as the config loads, so the login screen gets it too:
// - the website's Adobe Fonts kit, the one src/layouts/BaseLayout.astro loads,
//   for the fonts theme.ts names;
// - a pure black page behind the Studio: Sanity paints html and body a
//   blue-black (#13141b / #0d0e12) of its own;
// - the workspace layout (below), kept right as the Studio re-renders.
const FONTS = 'https://use.typekit.net/nqu1vih.css'

if (typeof document !== 'undefined') {
  if (!document.querySelector(`link[href="${FONTS}"]`)) {
    document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: FONTS}))
  }
  const root = document.documentElement
  root.style.setProperty('--black', '#000000')
  for (const el of [root, document.body]) el?.style.setProperty('background-color', '#000000')
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
const SIDEBAR_WIDTH = 248

function set(el: HTMLElement, styles: Record<string, string>) {
  for (const [property, value] of Object.entries(styles)) {
    if (el.style.getPropertyValue(property) !== value || el.style.getPropertyPriority(property) !== 'important') {
      el.style.setProperty(property, value, 'important')
    }
  }
}

function layout() {
  const width = `${SIDEBAR_WIDTH}px`
  // Every row of panes: the pane elements carry data-pane-index (set by
  // Sanity after its other attributes, so it survives), grouped by parent
  const rows = new Map<HTMLElement, HTMLElement[]>()
  for (const pane of document.querySelectorAll<HTMLElement>('[data-pane-index], [data-testid="pane"], [data-testid="document-pane"]')) {
    const parent = pane.parentElement
    if (!parent) continue
    const list = rows.get(parent) ?? []
    if (!list.includes(pane)) list.push(pane)
    rows.set(parent, list)
  }
  for (const [row, panes] of rows) {
    // One pane alone (the visual editor's form) is left to Sanity
    if (panes.length < 2) continue
    set(row, {width: '100%', 'max-width': 'none', flex: '1 1 auto'})
    let parent: HTMLElement | null = row.parentElement
    for (let depth = 0; parent && depth < 3; depth++, parent = parent.parentElement) {
      set(parent, {width: '100%', 'max-width': 'none'})
    }
    panes.sort((x, y) => Number(x.dataset.paneIndex ?? 0) - Number(y.dataset.paneIndex ?? 0))
    panes.forEach((pane, index) => {
      const collapsed = pane.hasAttribute('data-pane-collapsed')
      const last = index === panes.length - 1
      if (collapsed) return
      if (index === 0) {
        set(pane, {flex: `0 0 ${width}`, width, 'min-width': width, 'max-width': width})
      } else if (last) {
        set(pane, {flex: '1 1 0px', width: 'auto', 'max-width': 'none', display: 'flex'})
      } else if (pane.querySelector('[data-tomrow-collection="compact"]') || panes[index + 1]?.querySelector('[data-tomrow-document], [data-testid="document-panel"]')) {
        // A collection's list, with an item open beside it: it steps aside
        set(pane, {display: 'none'})
      }
    })
  }
  // Editing always means the working draft: the Published / Draft chips and
  // the top bar's Drafts menu go (the status beside Publish Live remains)
  for (const el of document.querySelectorAll<HTMLElement>('[data-ui="ReleasesNav"], [data-testid="document-perspective-list"], [data-testid="global-perspective-menu-button"]')) {
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
