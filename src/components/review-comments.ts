/* The review layer (website comments) set up for this site: development
   and staging only, loaded by BaseLayout.astro, which leaves it out of
   production.

   The layer itself is the CMS package's, served by this site's Studio
   (<studio>/static/cms-comments.js): it shows only in a tab opened from
   the Studio's Comments page, and keeps every comment in Sanity through
   that Studio, signed in as the editor (see the package's README,
   "Website comments"). This site keeps no copy of it; it only tells the
   layer what it can't know:
   - the pages, read from src/pages (review-pages.ts), and the notes
     (design-notes.ts) as the designer's first comments, both in the page
     as JSON (#review-data);
   - the site's ways of moving: Barba for going to a page, Lenis for
     scrolling to a comment, the Barba container as the page's content. */
import type { DesignNote } from './design-notes';
import type { ReviewPage } from './review-pages';

// The site's globals this uses (transitions.js sets them), typed here alone
const site = window as unknown as {
  barba?: { go: (href: string) => Promise<unknown> };
  lenis?: { scrollTo: (target: Element, options?: { offset?: number }) => void };
  cmsComments?: Record<string, unknown>;
};

/** The Studio that serves the layer: the local one in development, the hosted one on staging */
const STUDIO_URL = import.meta.env.DEV ? 'http://localhost:3333' : 'https://tomrowstudios.sanity.studio';

const data = document.getElementById('review-data');
const { notes, notesDate, pages } = JSON.parse(data?.textContent || '{}') as { notes?: DesignNote[]; notesDate?: string; pages?: ReviewPage[] };

/** The notes' author: the designer (a picture's URL in `avatar` shows in place of the initials) */
const designer = { id: 'stas', name: 'Stas', role: 'admin' };

/** A note's page as an address: its Barba namespace looked up among the pages ('*' stays every page) */
const pathFor = (namespace: string) =>
  namespace === '*' ? '*' : pages?.find((page) => page.namespace === namespace)?.path ?? `/${namespace}`;

// The notes as the designer's expanded comments, each placed as it always was
const seeds = (notes ?? []).map((note) => {
  const id = `note:${note.page}:${note.target}`;
  const createdAt = note.date ?? notesDate ?? new Date(0).toISOString();
  return {
    id,
    origin: 'seed',
    display: note.display ?? 'expanded',
    request: note.request ? { type: note.request, title: note.title ?? 'Add image' } : undefined,
    page: pathFor(note.page),
    anchor: { type: 'placement', selector: note.target, at: note.at ?? 'top-right', offset: note.offset ?? [0, 0] },
    status: 'open',
    createdAt,
    messages: [{ id: `${id}:0`, authorId: designer.id, body: note.text, attachments: [], createdAt }],
  };
});

const container = () => document.querySelector('[data-barba="container"]:last-of-type') ?? document.body;

// Only a tab the Studio opened can comment: elsewhere, nothing is loaded
if (data && window.opener && window.top === window) {
  site.cmsComments = {
    users: [designer],
    pages: (pages ?? []).map(({ path, name }) => ({ path, name })),
    seeds,
    root: container,
    currentPageName: () => container().getAttribute('data-page-name') || document.title.split(' — ')[0],
    navigate: (path: string) => (site.barba ? site.barba.go(path) : location.assign(path)),
    // A third of the way down the screen, Lenis carrying the page there as the wheel does
    scrollTo: (el: Element) => site.lenis
      ? site.lenis.scrollTo(el, { offset: -window.innerHeight / 3 })
      : el.scrollIntoView({ block: 'center', behavior: 'smooth' }),
  };
  document.head.append(Object.assign(document.createElement('script'), { src: `${STUDIO_URL}/static/cms-comments.js` }));
}
