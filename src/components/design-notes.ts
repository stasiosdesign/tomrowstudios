/* Design notes: a temporary review aid, shown with Shift + G
   (public/js/grid-overlay.js) on desktop, never on production
   (BaseLayout.astro leaves them out). Questions and remarks for walking
   through the site with Tom, each set beside the element it is about, over
   the site faded behind them.

   One entry a note:
   - `page`: the page's Barba namespace (BaseLayout's `namespace`: index,
     influence, partner, shop, architecture…), or '*' for every page
   - `target`: a CSS selector for the element the note is about (the first
     match on the page); a note whose target is missing or hidden is skipped
   - `at`: where the card stands against the target, '<y>-<x>': y is top or
     bottom (inside the target's box), above or below (outside it); x is
     left or right (the card's edge on the target's), before or after (the
     card beside the target, clear of it)
   - `offset`: a nudge in pixels, [x, y]
   Wording: short, one point a note. Speak of the site as it is ("the
   architectural work shown here"); where Tom comes in, by name ("Tom’s
   presence"), never him or his.
   To remove the whole system: delete this file, the notes' markup and
   script lines in BaseLayout.astro, grid-overlay.js and "Design notes" in
   style.css. */

export interface DesignNote {
  page: string;
  target: string;
  at?: `${'top' | 'bottom' | 'above' | 'below'}-${'left' | 'right' | 'before' | 'after'}`;
  offset?: [number, number];
  text: string;
}

export const DESIGN_NOTES: DesignNote[] = [
  {
    page: 'index',
    target: '.home-list__shot.is--film',
    at: 'top-after',
    offset: [24, 56],
    text: 'Do we have a video for this?',
  },
  {
    page: 'index',
    target: '.home-reel__surface-inner',
    at: 'bottom-left',
    offset: [24, -24],
    text: 'The background takes its colours from each image, so images with a few strong colours work best. New, more engaging images needed.',
  },
  {
    page: 'index',
    target: '.logo-grid__row',
    at: 'above-right',
    offset: [-24, -16],
    text: 'Placeholder logos: to be replaced with the correct ones.',
  },

  // ---- Influence: the gallery the four pictures open into, one note to a
  // picture, under its name (Architectural Work, Architectural Content,
  // Building an Audience; Publishing, Speaking & Collaboration): each shows
  // only while its picture is the one full-screen and its words are up
  // (the caption hidden otherwise), so it never rides the moving strip
  {
    page: 'influence',
    target: '[data-stage-caption="0"] .influence-stage__caption-head',
    at: 'below-left',
    offset: [0, 32],
    text: 'We need a visual that clearly shows Tom’s architectural work, or Tom actively working.',
  },
  {
    page: 'influence',
    target: '[data-stage-caption="1"] .influence-stage__caption-head',
    at: 'below-left',
    offset: [0, 32],
    text: 'We need Tom recording or creating content: ideally a video, or at least a still that clearly shows content being made.',
  },
  {
    page: 'influence',
    target: '[data-stage-caption="2"] .influence-stage__caption-head',
    at: 'below-left',
    offset: [0, 32],
    text: 'We need something that shows the channel or platform growing, so it reads as an audience building.',
  },
  {
    page: 'influence',
    target: '[data-stage-caption="3"] .influence-stage__caption-head',
    at: 'below-left',
    offset: [0, 32],
    text: 'We need a strong image of Tom speaking in public.',
  },

  // ---- Every page with the footer
  {
    page: '*',
    target: '.site-footer__signup',
    at: 'below-right',
    offset: [0, 16],
    text: 'Which newsletter platform is being used?',
  },
];
