/* Visual editing in the Studio's Visual editor (Sanity's Presentation tool).

   Staging and development only: production builds leave it out, and even
   there it loads only when the page is open in a frame (see BaseLayout.astro),
   so visitors never download it. With a Studio as the parent it:
   - connects the click-to-edit outlines (enableVisualEditing);
   - asks the Studio for the page's content in live mode (enableLiveMode): the
     Studio runs the queries with the editor's own login, drafts included, and
     sends every change as it is typed, so no token reaches the browser;
   - marks the parts it edits with data-sanity attributes and writes the drafts
     into them, and again whenever Barba brings a page in.
   That covers every section of the home page, its logos (each opens its
   client), and on every other page the parts its own document holds (each
   page names its
   document on <main>, and each part the field it shows: data-page-doc and
   data-page-field, see BaseLayout.astro and src/pages). The page underneath
   is rendered by staging in draft mode (src/sanity/draft-mode/), so
   everything else a draft changes, a photo, card, client or whole project
   added or removed, shows when the page is reloaded. */
import { createQueryStore } from '@sanity/core-loader';
import { createDataAttribute, enableVisualEditing } from '@sanity/visual-editing-standalone';
import { sanityClient } from './client';
import { urlFor, type SanityImage } from './image';
import { HOME_PAGE_QUERY, PAGE_LIVE_QUERY } from './queries';
import type { HOME_PAGE_QUERY_RESULT, PAGE_LIVE_QUERY_RESULT } from './sanity.types';

type Home = NonNullable<HOME_PAGE_QUERY_RESULT>;
type Path = Parameters<typeof createDataAttribute>[0]['path'];
type Doc = { id: string; type: string };
type Value = string | null | undefined;

const HOME: Doc = { id: 'homePage', type: 'homePage' };

// The Studio framing this page; its outlines open documents there
const studioUrl = (() => {
  try {
    return new URL(document.referrer).origin;
  } catch {
    return 'https://tomrowstudios.sanity.studio';
  }
})();

const mark = (el: Element | null | undefined, path: Path, doc = HOME) => {
  if (el instanceof HTMLElement) {
    el.dataset.sanity = createDataAttribute({ baseUrl: studioUrl, id: doc.id, type: doc.type, path }).toString();
  }
};

const setText = (el: Element | null | undefined, text: Value) => {
  if (el && text != null && el.textContent !== text) el.textContent = text;
};

// A draft photo replaces the published one at one width: the image's srcset
// (and a deferred hero photo's data-src) would otherwise keep showing the old
const setImage = (img: Element | null | undefined, image: SanityImage | null | undefined, width: number) => {
  if (!(img instanceof HTMLImageElement) || !image?.asset) return;
  const src = urlFor(image).width(width).url();
  if (img.getAttribute('src') === src) return;
  img.removeAttribute('srcset');
  img.removeAttribute('data-srcset');
  img.removeAttribute('data-src');
  img.src = src;
};

// A field shown as an element's text
const text = (el: Element | null | undefined, path: Path, value: Value, doc = HOME) => {
  mark(el, path, doc);
  setText(el, value);
};

// A button (Button.astro) and its label. Rewriting the label replaces its
// hover's split; split-hover.js splits the new text on the next hover.
const button = (cta: Element | null | undefined, path: Path, label: Value, doc = HOME) => {
  mark(cta, path, doc);
  setText(cta?.querySelector('.cta__label'), label);
};

// The same parts, sizes and order as src/pages/index.astro renders
const section = (name: string) => document.querySelector(`[data-home-section="${name}"]`);

function renderHero(hero: Home['hero']) {
  // The home page's reel (its headline a hidden heading), or the parked
  // hero (/parked: its slides' captions, photographs and buttons too)
  const root = document.querySelector('.home-reel, .home-hero');
  if (!root || !hero) return;

  text(root.querySelector('h1'), ['hero', 'headline'], hero.headline);

  const captions = root.querySelectorAll('[data-hero-dial-caption]');
  const photos = root.querySelectorAll('[data-hero-dial-mask-item]');
  const backgrounds = root.querySelectorAll('[data-hero-slide-bg]');
  hero.slides?.forEach((slide, i) => {
    const path: Path = ['hero', 'slides', { _key: slide._key }];
    text(captions[i], path, slide.caption);
    mark(photos[i], path);
    setImage(photos[i]?.querySelector('img'), slide.photo, 800);
    setImage(backgrounds[i]?.querySelector('img'), slide.background, 2500);
  });

  const [primary, secondary] = root.querySelectorAll('.home-hero__copy a.cta');
  button(primary, ['hero', 'primaryButton'], hero.primaryButton);
  button(secondary, ['hero', 'secondaryButton'], hero.secondaryButton);
}

function renderPractice(practice: Home['practice']) {
  const root = section('practice');
  if (!root || !practice) return;
  text(root.querySelector('h2'), ['practice', 'statement'], practice.statement);
}

// The logo wall's label is not shown on the page, and the clients' tiles
// are built once (a logo changed shows on the next build)
function renderHome(home: Home) {
  renderHero(home.hero);
  renderPractice(home.practice);
}

// Every other page: its <main> names its document (data-page-doc, the type,
// which is also the ID; a collection item, such as a shop item, names its
// type in data-page-type), and each part it holds names its field as a path
// into the document (data-page-field="hero.heading"): a picture (an img, at
// the width in data-page-width), a button (Button.astro's a.cta) or, for
// anything else, the element's text. A field a draft leaves empty keeps the
// page's own words.
const valueAt = (page: Record<string, unknown>, path: string[]) =>
  path.reduce<unknown>((at, key) => (at && typeof at === 'object' ? (at as Record<string, unknown>)[key] : undefined), page);

// A list of a page's repeatable blocks (the FAQ's questions): each block an
// element carrying its key (data-page-item), its fields marked by name
// (data-page-item-field). Redrawn from the draft in its order, so adding,
// removing and moving a block shows at once (a new one copies the first's
// markup), and each block marked by its key, so a click on one opens that
// very block in the Studio's panel.
type Block = { _key: string } & Record<string, unknown>;
function renderList(list: HTMLElement, path: string[], blocks: Block[], doc: Doc) {
  const current = [...list.querySelectorAll<HTMLElement>(':scope > [data-page-item]')];
  const template = current[0];
  if (!template) return;
  const byKey = new Map(current.map((el) => [el.dataset.pageItem, el]));
  let previous: HTMLElement | null = null;
  for (const block of blocks) {
    let el = byKey.get(block._key);
    byKey.delete(block._key);
    if (!el) {
      el = template.cloneNode(true) as HTMLElement;
      el.removeAttribute('open');
      el.dataset.pageItem = block._key;
    }
    const blockPath = [...path, { _key: block._key }];
    mark(el, blockPath, doc);
    el.querySelectorAll<HTMLElement>('[data-page-item-field]').forEach((field) => {
      const name = field.dataset.pageItemField ?? '';
      const value = block[name];
      text(field, [...blockPath, name], typeof value === 'string' ? value : null, doc);
    });
    if (previous) previous.after(el);
    else list.prepend(el);
    previous = el;
  }
  byKey.forEach((el) => el.remove());
}

function renderPage(doc: Doc, page: Record<string, unknown>) {
  const main = document.querySelector(`main[data-page-doc="${doc.id}"]`);
  // While the draft has no blocks in a list, the page keeps the ones it was built with
  main?.querySelectorAll('[data-page-list]').forEach((list) => {
    if (!(list instanceof HTMLElement) || !list.dataset.pageList) return;
    const path = list.dataset.pageList.split('.');
    const blocks = valueAt(page, path);
    if (Array.isArray(blocks) && blocks.length > 0) renderList(list, path, blocks as Block[], doc);
  });
  main?.querySelectorAll('[data-page-field]').forEach((el) => {
    if (!(el instanceof HTMLElement) || !el.dataset.pageField) return;
    const path = el.dataset.pageField.split('.');
    const value = valueAt(page, path);
    if (el instanceof HTMLImageElement) {
      mark(el, path, doc);
      setImage(el, value as SanityImage | null | undefined, Number(el.dataset.pageWidth) || 1600);
    } else if (el.matches('a.cta')) {
      button(el, path, typeof value === 'string' ? value : null, doc);
    } else {
      text(el, path, typeof value === 'string' ? value : null, doc);
    }
  });
}

// The Studio's address bar follows the page: every page Barba brings in is
// reported (so after /api/draft-mode/enable redirects here, the Studio sees
// the page, not the activation route), and a page the Studio asks for is
// opened through Barba, keeping its transitions. Same-page moves are ignored.
type Barba = { hooks: { after: (hook: () => void) => void }; go?: (href: string) => Promise<void> };
const getBarba = () => (window as unknown as { barba?: Barba }).barba;
const samePage = (url: string) => new URL(url, location.href).pathname === location.pathname;
enableVisualEditing({
  zIndex: 10000, // above the site's own layers (400 at most)
  history: {
    subscribe: (navigate) => {
      const report = () => navigate({ type: 'replace', url: `${location.pathname}${location.search}${location.hash}` });
      report();
      getBarba()?.hooks.after(report);
      window.addEventListener('popstate', report);
      return () => window.removeEventListener('popstate', report);
    },
    update: (update) => {
      if (update.type === 'pop') return history.back();
      if (samePage(update.url)) return;
      const barba = getBarba();
      if (barba?.go) barba.go(update.url);
      else location.assign(update.url);
    },
  },
});

const { createFetcherStore, enableLiveMode } = createQueryStore({ client: sanityClient, ssr: false });
enableLiveMode({ client: sanityClient });

// A live query, asked for the first time a page needs it (so the Studio's
// list of documents on a page only has the ones it shows); its latest result
// is drawn in on arrival and again on every page Barba brings in after that
function live<T>(query: string, render: (data: NonNullable<T>) => void, params: Record<string, unknown> = {}) {
  let latest: NonNullable<T> | undefined;
  let asked = false;
  return () => {
    if (latest) render(latest);
    if (asked) return;
    asked = true;
    createFetcherStore<T>(query, params).subscribe(({ data }) => {
      if (data == null) return;
      latest = data;
      render(data);
    });
  };
}

const home = live<HOME_PAGE_QUERY_RESULT>(HOME_PAGE_QUERY, renderHome);

// One live query per page document, made the first time its page is shown
// (keyed by the document's ID; the type is the ID unless <main> says otherwise)
const pages = new Map<string, () => void>();
function page(id: string, type = id) {
  let show = pages.get(id);
  if (!show) {
    const doc: Doc = { id, type };
    show = live<PAGE_LIVE_QUERY_RESULT>(PAGE_LIVE_QUERY, (data) => renderPage(doc, data as Record<string, unknown>), { id });
    pages.set(id, show);
  }
  show();
}

function update() {
  // The home page (its hero as the list, or the parked one)
  if (document.querySelector('.home-reel, .home-hero')) home();
  const main = document.querySelector('main[data-page-doc]');
  if (main instanceof HTMLElement && main.dataset.pageDoc) page(main.dataset.pageDoc, main.dataset.pageType || undefined);
}

update();

// Opening a section in the Studio's side panel scrolls the page to it
// (the CMS package's SectionField and PreviewControls post its field
// name). The home page marks its sections with their field names
// (data-home-section; the hero is .home-hero), other pages each part they
// show (data-page-field, "hero.heading"...). Only from the Studio framing
// this page; through Lenis where the site scrolls smoothly, so the two never
// fight over the position.
const sectionNamed = (name: string): Element | null => {
  const field = CSS.escape(name);
  if (name === 'hero' && document.querySelector('.home-hero')) return document.querySelector('.home-hero');
  const marked = document.querySelector(`[data-home-section="${field}"]`);
  if (marked) return marked;
  const part = document.querySelector(`main [data-page-field="${field}"], main [data-page-field^="${field}."]`);
  return part?.closest('section') ?? part;
};
type Lenis = { scrollTo: (target: Element, options?: { offset?: number }) => void };
// The message's type: SHOW_SECTION_MESSAGE and LEGACY_SHOW_SECTION_MESSAGE in
// @stasiosdesign/sanity-cms/protocol (the Studio before 1.0 sent the second)
const SHOW_SECTION = new Set(['sanity-cms/show-section', 'tomrow/show-section']);
window.addEventListener('message', (event) => {
  if (event.source !== window.parent || !SHOW_SECTION.has(event.data?.type) || typeof event.data.section !== 'string') return;
  const target = sectionNamed(event.data.section);
  if (!target) return;
  const lenis = (window as unknown as { lenis?: Lenis }).lenis;
  if (lenis) lenis.scrollTo(target);
  else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Shift + G opens and closes the Studio's editing panel, also while the
// keyboard is in the page: the Studio can't hear keys pressed in its frame,
// so the page passes it on (TOGGLE_EDITOR_MESSAGE in
// @stasiosdesign/sanity-cms/protocol). Not while typing in a field.
window.addEventListener('keydown', (event) => {
  if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== 'g') return;
  const el = event.target;
  if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
  event.preventDefault();
  window.parent.postMessage({ type: 'sanity-cms/toggle-editor' }, '*');
});

// Barba swaps pages without a reload, bringing in the published words
const { barba } = window as unknown as { barba?: { hooks: { after: (hook: () => void) => void } } };
barba?.hooks.after(update);
