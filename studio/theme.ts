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
   active item, an icon button under the pointer). On this black Studio they
   keep white text and icons, on the same faint grey washes studio.css uses
   (--tomrow-hover, --tomrow-selected), so nothing turns black on hover. */
const HOVER_BG = '#0f0f0f' // white at 6% on black
const SELECTED_BG = '#1a1a1a' // white at 10% on black
// The same washes see-through, for icon buttons, which also sit on grey
const WASH_HOVER = 'rgba(255, 255, 255, 0.06)'
const WASH_SELECTED = 'rgba(255, 255, 255, 0.1)'

/* Filled controls. Everything that is clicked, typed into or toggled is a
   solid surface, never a thin outline on black: its edge is its own fill.

   - Fields (text, number, URL, text areas, rich text, selects, dates, the
     search boxes, checkboxes) and the secondary buttons (Sanity's ghost
     buttons: Select, Columns, Generate, Add item, Upload...) are grey, a
     step up from the page, lighter under the pointer and when pressed or
     chosen, darker and dimmer when disabled.
   - Primary buttons are white with black text, destructive ones the site's
     red with white text (the Publish button's red, studio.css).
   - A field with a problem stays tinted red with a red edge; the keyboard
     focus ring is Sanity's own.
   Icon-only buttons (bleed: menus, close, chevrons) stay flat, as before. */
const FIELD = '#1a1a1a' // white at 10% on black: --tomrow-selected, the tool switch's track
const FIELD_HOVER = '#262626'
const FIELD_PRESSED = '#333333'
const FIELD_DISABLED = '#0d0d0d'
const DISABLED_FG = '#4d4d4d'
const PLACEHOLDER = '#8c8c8c' // 5:1 on FIELD
const RED = '#dd341d' // --cta-accent-color in src/styles/style.css

type StateColor = {bg: string; bg2?: string; border: string; fg: string; icon: string; placeholder?: string; muted: {fg: string}}
type ToneColor = {
  selectable?: Record<string, Record<string, StateColor>>
  button?: Record<string, Record<string, Record<string, StateColor>>>
  input?: Record<string, Record<string, StateColor>>
}

function studioColors(color: NonNullable<StudioTheme['color']>): NonNullable<StudioTheme['color']> {
  const next = structuredClone(color) as unknown as Record<string, Record<string, ToneColor>>
  const paint = (state: StateColor | undefined, bg: string, fg?: string) => {
    if (!state) return
    Object.assign(state, {bg, border: bg}, fg ? {fg, icon: fg, muted: {...state.muted, fg: fg === WHITE ? '#b2b2b2' : fg}} : {})
  }
  const field = (state: StateColor | undefined, bg: string, fg: string, placeholder: string, border = bg) => {
    if (state) Object.assign(state, {bg, bg2: bg, border, fg, placeholder})
  }
  for (const scheme of ['light', 'dark']) {
    for (const tone of Object.keys(next[scheme] ?? {})) {
      const card = next[scheme][tone]
      if (tone === 'default' || tone === 'transparent') {
        paint(card.selectable?.default?.hovered, HOVER_BG, WHITE)
        paint(card.selectable?.default?.pressed, SELECTED_BG, WHITE)
        paint(card.selectable?.default?.selected, SELECTED_BG, WHITE)
        paint(card.button?.bleed?.default?.hovered, WASH_HOVER, WHITE)
        paint(card.button?.bleed?.default?.pressed, WASH_SELECTED, WHITE)
        paint(card.button?.bleed?.default?.selected, WASH_SELECTED, WHITE)
      }

      // Icon buttons: no fill or edge of their own, so they sit cleanly on
      // black and on the grey fields alike (the rich-text toolbar, a list's
      // menus); their washes are see-through for the same reason
      for (const states of Object.values(card.button?.bleed ?? {})) {
        paint(states.enabled, 'transparent')
        paint(states.disabled, 'transparent')
      }

      // Secondary buttons: grey fills; the default tone's text white, a
      // coloured tone's (Unpublish, Delete) its own colour
      for (const [buttonTone, states] of Object.entries(card.button?.ghost ?? {})) {
        const fg = buttonTone === 'default' ? WHITE : states.enabled?.fg
        paint(states.enabled, FIELD, fg)
        paint(states.hovered, FIELD_HOVER, fg)
        paint(states.pressed, FIELD_PRESSED, fg)
        paint(states.selected, FIELD_PRESSED, fg)
        paint(states.disabled, FIELD_DISABLED, DISABLED_FG)
      }

      // Solid buttons: white for the neutral and primary ones, red for the
      // destructive ones
      for (const [buttonTone, fill] of [
        ['default', {enabled: WHITE, hovered: '#e6e6e6', pressed: '#d4d4d4', fg: BLACK}],
        ['primary', {enabled: WHITE, hovered: '#e6e6e6', pressed: '#d4d4d4', fg: BLACK}],
        ['critical', {enabled: RED, hovered: '#e45442', pressed: '#c22e1a', fg: WHITE}],
      ] as const) {
        const states = card.button?.default?.[buttonTone]
        if (!states) continue
        paint(states.enabled, fill.enabled, fill.fg)
        paint(states.hovered, fill.hovered, fill.fg)
        paint(states.pressed, fill.pressed, fill.fg)
        paint(states.selected, fill.pressed, fill.fg)
        paint(states.disabled, FIELD_DISABLED, DISABLED_FG)
      }

      // Fields
      const input = card.input
      field(input?.default?.enabled, FIELD, WHITE, PLACEHOLDER)
      field(input?.default?.hovered, FIELD_HOVER, WHITE, PLACEHOLDER)
      field(input?.default?.readOnly, '#121212', '#b2b2b2', '#666666')
      field(input?.default?.disabled, FIELD_DISABLED, DISABLED_FG, '#404040')
      for (const state of ['enabled', 'hovered', 'readOnly', 'disabled']) {
        field(input?.invalid?.[state], state === 'hovered' ? '#2e1512' : '#241210', '#f58e85', '#bf3629', '#7a2219')
      }
    }
  }
  return next as unknown as NonNullable<StudioTheme['color']>
}

// One typeface throughout: the site's Inter Tight, for labels too
export const theme: StudioTheme = {
  ...base,
  color: base.color && studioColors(base.color),
  fonts: {
    ...fonts,
    label: {...fonts.label, family: TEXT},
  },
}
