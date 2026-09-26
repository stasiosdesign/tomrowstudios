import {buildLegacyTheme, type StudioTheme} from 'sanity'

// The website's look: its two Adobe Fonts (loaded by page.ts) and its pure
// black ground with white type (src/styles/style.css).
const TEXT = '"inter-tight-variable", sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' // code fields only
const BLACK = '#000000'
const WHITE = '#ffffff'

// The legacy builder derives every tone from a background, a text colour and a
// grey between them: black, white and a neutral grey give neutral greys, with
// none of the default blue. Its light scheme reads the component colours and
// its dark scheme the navigation colours, so both are set to black, and the
// Studio is black whichever scheme is picked.
const base = buildLegacyTheme({
  '--font-family-base': TEXT,
  '--font-family-monospace': MONO,
  '--black': BLACK,
  '--white': WHITE,
  '--component-bg': BLACK,
  '--component-text-color': WHITE,
  '--main-navigation-color': BLACK,
  '--main-navigation-color--inverted': WHITE,
  '--gray-base': '#808080',
  '--gray': '#808080',
})

// The builder always returns all four fonts (text, heading, label, code)
const fonts = base.fonts as NonNullable<StudioTheme['fonts']>

// One typeface throughout: the site's Inter Tight, for labels too
export const theme: StudioTheme = {
  ...base,
  fonts: {
    ...fonts,
    label: {...fonts.label, family: TEXT},
  },
}
