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
    text: 'The background dynamically adjusts based on the dominant colours in each image. Ideally, the images we choose should have a limited palette of just a few primary colours to make this effect work effectively. We also need a new selection of images, potentially something more visually engaging.',
  },
  {
    page: 'index',
    target: '.logo-grid__row',
    at: 'above-right',
    offset: [-24, -16],
    text: 'We need to replace these with the correct logos.',
  },
  {
    page: 'index',
    target: '.site-footer__signup',
    at: 'below-right',
    offset: [0, 16],
    text: 'What email newsletter platform are you using?',
  },
];
