/* The site's links, shared by the bar at the top (SiteNav.astro), the
   floating navigation (FloatingNav.astro) and the footer (SiteFooter.astro),
   so a page, the address or a channel is named in one place. */

/** The five pages, in the order every navigation lists them (the home
    hero's parts follow it too, home-hero.ts), each with the part of the
    practice it stands for (the floating menu's cards). Partners keeps its
    address, /partner. */
export const pages = [
  { href: '/', label: 'Home', note: 'Tomrowstudios' },
  { href: '/partner', label: 'Partners', note: 'Partnerships' },
  { href: '/influence', label: 'Influence', note: 'Architecture & influence' },
  { href: '/shop', label: 'Shop', note: 'Courses & resources' },
  { href: '/architecture', label: 'Architecture', note: 'Architectural projects' },
];

export const email = 'hello@tomrowstudios.com';

/** Tom's channels, each opened in a new tab (the hero's squares, the footer) */
export const socials = [
  { label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/tomrowstudios/' },
  { label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/in/thomas-rowntree-62642319a/' },
  { label: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@ThomasRowntree' },
] as const;

/** Architectural Influence at RIBA Books, where it is sold: the book's "Read
    the book" calls to action (the site's own page for it is /book) */
export const bookUrl = 'https://www.ribabooks.com/architectural-influence-mastering-content-creation-and-social-media-marketing_9781915722560';
