/* The home hero's parts and pictures (HomeHero.astro), in this order:
   About, Partners & Collabs, Architectural Influence, Shop & Courses,
   Architectural Projects, every picture shown 4:5. About is not a page: it
   is the film about Tom (the reel, reel.ts), and pressing its picture opens
   the reel's player out of it (reel.js), as the menu's Play Reel card does;
   its line on the right is set here.

   Each picture is the site's own (public/assets/images/hero, one per part,
   at several widths, from the masters in source-assets/photos/hero): its
   `picture` names the files, hero-<picture>-<width>.avif. `position`
   anchors each in its frame; `about` is the two sentences or so under its
   name in the list (all five 135 to 150 characters, so they set alike).
   `lines` is the part's name as the hero sets it beside its picture, one
   entry a line (About's says what Tom does), every line flush left.
   Every picture is shown in black and white (.is--mono, style.css) but
   those marked `colour` (Architectural Influence alone), and the mosaic
   behind each reads its colours from the picture as it is shown, the same
   way for all (heroPalette, hero-palette.ts, `mono`): greys behind a
   black and white one, its own colours behind the other.

   The home page's (index.astro, through HomeHero.astro), and its opening's
   squares, which grow into the same pictures. */
import { REEL_SRC, REEL_FALLBACK_POSTER, reelPoster, reelPreview, reelFilm } from './reel';
import { urlFor } from '../sanity/image';
import { heroPalette } from './hero-palette';

export type ReelEntry = { title: string; lines: string[]; href: string; about: string; picture: string; position?: string; film?: boolean; cursor: string; colour?: boolean };

const ENTRIES: ReelEntry[] = [
  { title: 'About', lines: ['Architecture, content', '& education for a global', 'audience'], href: '#about', cursor: 'Play Video', about: 'Architectural designer, author and content strategist Tom Rowntree. Press play for the short film on his work and the way he approaches it.', picture: 'about', position: '50% 30%', film: true },
  { title: 'Partners & Collabs', lines: ['Partners', '& Collabs'], href: '/partner', cursor: 'View Partners', about: 'Content and strategy for architecture, design and technology brands, made with Tom for an audience that cares about how buildings are made.', picture: 'partners', position: '50% 40%' },
  { title: 'Architectural Influence', lines: ['Architectural', 'Influence'], href: '/influence', cursor: 'View Influence', about: 'Content and a personal brand that build authority in architecture, through long-form explainers, walkthroughs and interviews shared online.', picture: 'influence', position: '50% 50%', colour: true },
  { title: 'Shop & Courses', lines: ['Shop', '& Courses'], href: '/shop', cursor: 'View Shop', about: 'Courses, a book and practical resources for working architects, drawn from Tom’s own experience of studying, practising and teaching architecture.', picture: 'shop', position: '50% 50%' },
  { title: 'Architectural Projects', lines: ['Architectural', 'Projects'], href: '/architecture', cursor: 'View Projects', about: 'Tom’s own design work, from early studies to his dissertation, with the drawings and the thinking behind each project gathered in one place.', picture: 'projects', position: '50% 50%' },
];

/** The parts' pictures, for a page that shows them elsewhere (the Partners
    page's stagger, partner.astro): each one's part, its file name and its
    anchor in the frame */
export const HERO_PICTURES = ENTRIES.map(({ title, picture, position }) => ({ title, picture, position }));

// The widths each picture is in the library at: up to 1500 (its full size),
// and Architectural Projects, supplied larger, up to 2400
const WIDTHS = [480, 720, 960, 1200, 1500];
const LARGER: Record<string, number[]> = { projects: [...WIDTHS, 1920, 2400] };
const file = (picture: string, width: number) => `/assets/images/hero/hero-${picture}-${width}.avif`;

/** One picture's sources, the list's and the opening's alike, so the opening's squares grow into the very files the list then shows.
    The frame is 3:4 (min(36.75vw, 63svh) across; below the desktop grid,
    half the screen less a margin, at most 48.3svh) and the picture in it
    130% of its height (the drift), so it is drawn 1.3 times the frame's
    width: `sizes` says so, and the browser picks a file sharp at that size */
export const reelImage = (picture: string) => ({
  src: file(picture, 960),
  srcset: (LARGER[picture] ?? WIDTHS).map((width) => `${file(picture, width)} ${width}w`).join(', '),
  sizes: '(max-width: 991px) min(62vw, 63vh), min(53vw, 90vh)',
});

export const pad = (n: number) => String(n).padStart(2, '0');

/** The hero's parts, with their palettes, for the page at `pageAddress` */
export async function homeHero(pageAddress: string) {
  const reel = ENTRIES.slice();
  // About plays the film: on production only once there is a reel
  // (reel.ts). The film's still stays the player's own placeholder.
  const showFilm = Boolean(REEL_SRC) || __DEPLOYMENT__ !== 'production';
  const filmStill = reelPoster || urlFor({ asset: { _id: REEL_FALLBACK_POSTER } }).width(1280).height(720).fit('crop').url();
  if (!showFilm) reel.shift();
  // The colours the mosaic behind the list takes from each picture
  // (hero-tint.js), read here as the page is built (hero-palette.ts, from
  // the library on the disk). Each travels on its list item
  // (data-tint-palette), so the mosaic is ready before the first paint.
  const tintPalettes = await Promise.all(reel.map(({ picture, position, colour }) => heroPalette(file(picture, 480), position, pageAddress, !colour)));
  return { reel, filmStill, tintPalettes, reelSrc: REEL_SRC, reelPreview, reelFilm };
}

export type HomeHeroData = Awaited<ReturnType<typeof homeHero>>;
