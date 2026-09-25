// The Studio's page itself, which the theme (theme.ts) cannot reach. Runs as
// soon as the config loads, so the login screen gets it too:
// - the website's Adobe Fonts kit, the one src/layouts/BaseLayout.astro loads,
//   for the fonts theme.ts names;
// - a pure black page behind the Studio: Sanity paints html and body a
//   blue-black (#13141b / #0d0e12) of its own.
const FONTS = 'https://use.typekit.net/nqu1vih.css'

if (typeof document !== 'undefined') {
  if (!document.querySelector(`link[href="${FONTS}"]`)) {
    document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: FONTS}))
  }
  const root = document.documentElement
  root.style.setProperty('--black', '#000000')
  for (const el of [root, document.body]) el?.style.setProperty('background-color', '#000000')
}
