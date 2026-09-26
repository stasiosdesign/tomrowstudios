/* The words and pictures the static pages were built with, one object per
   page document, shaped exactly like the documents in Sanity (section →
   field). Each page in src/pages renders its document from Sanity and falls
   back to these, field by field, so the site reads the same whether a
   document is missing, a section is empty or a field has been cleared. The
   Studio's seed script (studio/scripts/seed-pages.ts) makes the documents
   from the same objects, uploading each picture from public/.

   This file has no imports on purpose: the seed script loads it outside the
   site's build. Keep the strings the real characters (’, —, a non-breaking
   space), not HTML entities. */

/** A picture the page shipped with: its file under public/, its alt text, and the size the markup gave it, if any. */
export type ImageDefault = { path: string; alt: string; width?: number; height?: number };

type Section = Record<string, string | ImageDefault>;

export const PAGE_DEFAULTS = {
  architecturePage: {
    header: { label: 'Architecture', heading: 'Architecture' },
  },

  influencePage: {
    hero: {
      label: 'Influence',
      heading: 'Architectural Influence',
      lead: 'Tom Rowntree builds visibility, authority and opportunity for architects through deliberate content and a clear personal brand.',
      image: { path: '/assets/photos/talks/talk-02.jpg', alt: '' },
    },
    reach: {
      label: 'Reach',
      number: '180,700',
      text: 'Total followers across Instagram, TikTok, YouTube and LinkedIn.',
    },
    approach: {
      label: 'Approach',
      statement:
        'A more entrepreneurial approach to architecture. Architectural influence is about using content, social media and personal brand to build visibility, authority and opportunity within architecture.',
    },
    origins: { label: 'Origins', heading: 'From architecture to influence' },
    insights: {
      label: 'Insights',
      heading: 'The numbers behind the platform',
      lead: 'Audience, reach and recognition measured channel by channel — the full record of what the platform has built and what it has produced.',
    },
    atlas: { label: 'Global reach', heading: 'Twenty-one creators, thirteen countries' },
    book: {
      label: 'The book',
      heading: 'Architectural Influence',
      lead: 'A precedent analysis of the top 21 social media creators in the architecture profession, mapped across the globe — read for method rather than metrics, and published by RIBA Publishing.',
      button: 'Read the book',
    },
  },

  shopPage: {
    hero: {
      label: 'Shop',
      heading: 'Tools for a clearer Practice',
      lead: 'Courses, books and resources built for working architects — the methods behind the drawings, the writing and the presentations.',
      image: { path: '/assets/photos/studio/studio-05.jpg', alt: '' },
      primaryButton: 'Browse the shop',
      secondaryButton: 'Read the book',
    },
    catalogue: { label: 'Catalogue', heading: 'Everything in the shop' },
    testimonials: {
      heading: 'What students say',
      lead: 'Architects and designers on how the courses changed their work',
    },
    faq: {
      label: 'Support',
      heading: 'FAQ',
      note: 'Everything you need to know about access, delivery and support.',
      helpHeading: 'Need more help?',
      helpLead: 'Get in touch directly for anything not covered here',
      helpButton: 'Contact',
    },
  },

  partnersPage: {
    intro: {
      heading: 'Partners',
      lead: 'Content, strategy and collaboration for architecture, design and technology organisations',
      button: 'Get in touch',
    },
    clients: {
      label: 'Clients',
      heading: 'Seen in the studios that shape our world',
      note: 'Brands we’ve worked with',
    },
    statement: {
      heading: 'We make architecture legible',
      image: { path: '/assets/photos/events/event-01.jpg', alt: 'Tom Rowntree at the AEC summit', width: 1200, height: 1600 },
      lead: 'Practices, platforms and manufacturers come to Tomrow Studios to turn technical work into content people actually watch. Strategy, film and editorial — made by someone who has drawn the details.',
      button: 'See the work',
    },
    services: { label: 'Services', lead: 'What Tom does' },
    results: {
      label: 'Results',
      heading: 'What it delivered',
      note: 'Averaged across partner campaigns run in the last two years.',
    },
    enquire: {
      label: 'Enquire',
      heading: 'Send your enquiry',
      lead: 'Tell Tom about your organisation, what you are planning and the support you need.',
    },
    archive: {
      heading: 'The record',
      lead: 'A complete directory of collaborations, talks, and industry work',
    },
  },

  privacyPage: {
    header: { heading: 'Privacy' },
  },

  termsPage: {
    header: { heading: 'Terms' },
  },
} satisfies Record<string, Record<string, Section>>;

/** The page document types that have defaults here: every static page but the home page. */
export type PageType = keyof typeof PAGE_DEFAULTS;
export type PageDefaults = (typeof PAGE_DEFAULTS)[PageType];
