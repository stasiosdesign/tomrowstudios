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

/* The builder's hovered, pressed and selected states for the neutral tones
   invert: a light grey or blue ground with black text and icons (a menu's
   active item, a ghost button under the pointer). On this black Studio they
   keep white text and icons, on the same faint grey washes studio.css uses
   (--tomrow-hover, --tomrow-selected), so nothing turns black on hover. The
   coloured tones (critical, positive...) are left as they are. */
const HOVER_BG = '#0f0f0f' // white at 6% on black
const SELECTED_BG = '#1a1a1a' // white at 10% on black
type StateColor = {bg: string; border: string; fg: string; icon: string; muted: {fg: string}}
type ToneColor = {
  selectable?: Record<string, Record<string, StateColor>>
  button?: Record<string, Record<string, Record<string, StateColor>>>
}

function lightOnDark(color: NonNullable<StudioTheme['color']>): NonNullable<StudioTheme['color']> {
  const next = structuredClone(color) as unknown as Record<string, Record<string, ToneColor>>
  const keepLight = (state: StateColor | undefined, bg: string) => {
    if (!state) return
    Object.assign(state, {bg, border: bg, fg: WHITE, icon: WHITE, muted: {...state.muted, fg: '#b2b2b2'}})
  }
  for (const scheme of ['light', 'dark']) {
    for (const tone of ['default', 'transparent']) {
      const card = next[scheme]?.[tone]
      if (!card) continue
      keepLight(card.selectable?.default?.hovered, HOVER_BG)
      keepLight(card.selectable?.default?.pressed, SELECTED_BG)
      keepLight(card.selectable?.default?.selected, SELECTED_BG)
      for (const mode of ['bleed', 'ghost']) {
        keepLight(card.button?.[mode]?.default?.hovered, HOVER_BG)
        keepLight(card.button?.[mode]?.default?.pressed, SELECTED_BG)
        keepLight(card.button?.[mode]?.default?.selected, SELECTED_BG)
      }
    }
  }
  return next as unknown as NonNullable<StudioTheme['color']>
}

// One typeface throughout: the site's Inter Tight, for labels too
export const theme: StudioTheme = {
  ...base,
  color: base.color && lightOnDark(base.color),
  fonts: {
    ...fonts,
    label: {...fonts.label, family: TEXT},
  },
}
