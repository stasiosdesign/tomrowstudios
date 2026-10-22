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
   Wording: notes from the designer to Tom, talking a decision through or
   asking for something: short, one point a note, polite and collaborative
   without being formal ("Could you please…", "Would it make sense to…",
   "It would be useful to…"), Tom as "you", never him or his.
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
    text: 'Do you have a video we could use here?',
  },
  {
    page: 'index',
    target: '.home-reel__surface-inner',
    at: 'bottom-left',
    offset: [24, -24],
    text: 'The background takes its colours from each image, so images with a few strong colours work best. Could you please share some more engaging images for this?',
  },
  {
    page: 'index',
    target: '.logo-grid__row',
    at: 'above-right',
    offset: [-24, -16],
    text: 'These logos are placeholders. Could you please send the correct ones?',
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
    text: 'Could you please share an image that clearly shows your architectural work, or you at work?',
  },
  {
    page: 'influence',
    target: '[data-stage-caption="1"] .influence-stage__caption-head',
    at: 'below-left',
    offset: [0, 32],
    text: 'Could you please share something of you recording or creating content? Ideally a video, or at least a still that clearly shows content being made.',
  },
  {
    page: 'influence',
    target: '[data-stage-caption="2"] .influence-stage__caption-head',
    at: 'below-left',
    offset: [0, 32],
    text: 'Do you have something that shows the channel or platform growing, so this reads as an audience building?',
  },
  {
    page: 'influence',
    target: '[data-stage-caption="3"] .influence-stage__caption-head',
    at: 'below-left',
    offset: [0, 32],
    text: 'Could you please share a strong image of you speaking in public?',
  },

  // ---- Partners: the projects. Three questions on the stagger's first
  // cards, in from their top left corners (the two lower columns' and the
  // right-hand one's), and beside the first card carrying a partner's logo
  {
    page: 'partner',
    target: '.partner-stagger__col:nth-child(4) .slide-card',
    at: 'top-left',
    offset: [16, 16],
    text: 'Which partners would you like to showcase most prominently on this page?',
  },
  {
    page: 'partner',
    target: '.partner-stagger__col:nth-child(2) .slide-card',
    at: 'top-left',
    offset: [16, 16],
    text: 'Would you like an archive for additional partnerships? If so, which projects should be featured here, and which should go into the archive?',
  },
  {
    page: 'partner',
    target: '.partner-stagger__col:nth-child(1) .slide-card',
    at: 'top-left',
    offset: [16, 16],
    text: 'Could you please provide two complete case studies, including the project background, your role, services provided, process, deliverables and outcomes? This will help me understand what information we need to accommodate in the CMS.',
  },
  {
    page: 'partner',
    target: '.partner-stagger .slide-card:has(.slide-card__logo)',
    at: 'top-after',
    offset: [24, 24],
    text: 'Could you please send your partners’ logos?',
  },

  // ---- Partners: What Tom does, under its words
  {
    page: 'partner',
    target: '.services .scroll-list__lead',
    at: 'below-left',
    offset: [0, 32],
    text: 'Could you please outline the services you currently offer to firms and organisations? I’d like to make sure this section accurately reflects what you do.',
  },

  // ---- Partners: the testimonials, at the stage's top right
  {
    page: 'partner',
    target: '.testimonial-stage',
    at: 'top-right',
    offset: [-24, 24],
    text: 'Could you please share some testimonials, each with a photo of the person?',
  },

  // ---- Partners: the outcomes, under the heading, its note and its calls
  {
    page: 'partner',
    target: '.results-layout__head',
    at: 'below-left',
    offset: [0, 32],
    text: 'Could you please provide some real metrics or measurable outcomes from your collaborations? It would be useful to demonstrate the results of your work here.',
  },

  // ---- Shop: the testimonials, just over the row of quotes, at its right
  {
    page: 'shop',
    target: '.centered-slider-row',
    at: 'above-right',
    offset: [-24, -16],
    text: 'Do you have more testimonials we could add here?',
  },

  // ---- Shop: the FAQ, under its heading and note
  {
    page: 'shop',
    target: '.faq-layout__head',
    at: 'below-left',
    offset: [0, 32],
    text: 'Could you please send the questions you’re asked most often, so we can add them here?',
  },

  // ---- Architecture: just over the row of projects, at its right
  {
    page: 'architecture',
    target: '.parallax-slider__list',
    at: 'above-right',
    offset: [-24, -24],
    text: 'Could you please add the final information for each project in the CMS?',
  },

  // ---- Every page with the footer
  {
    page: '*',
    target: '.site-footer__signup',
    at: 'below-right',
    offset: [0, 16],
    text: 'Which newsletter platform are you using?',
  },
];
