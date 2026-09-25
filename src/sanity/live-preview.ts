/* Visual editing in the Studio's Presentation tool.

   Loaded only when the page is open in a frame (see BaseLayout.astro), so
   visitors never download it. With a Studio as the parent it:
   - connects the click-to-edit outlines (enableVisualEditing);
   - asks the Studio for the page's content in live mode (enableLiveMode): the
     Studio runs the queries with the editor's own login, drafts included, and
     sends every change as it is typed, so the page needs no token and no
     server;
   - marks the parts it edits with data-sanity attributes and writes the drafts
     into them, and again whenever Barba brings a page in.
   That covers every section of the home page, its logos (each opens its
   client), and the Get in touch block on every page that ends with it. The
   static page underneath stays the published one; a photo, card or client
   added or removed shows once it is published and the site rebuilt. */
import { createQueryStore } from '@sanity/core-loader';
import { createDataAttribute, enableVisualEditing } from '@sanity/visual-editing-standalone';
import { sanityClient } from './client';
import { urlFor, type SanityImage } from './image';
import { CLIENT_LOGOS_QUERY, GET_IN_TOUCH_QUERY, HOME_PAGE_QUERY } from './queries';
import type { CLIENT_LOGOS_QUERY_RESULT, GET_IN_TOUCH_QUERY_RESULT, HOME_PAGE_QUERY_RESULT } from './sanity.types';

type Home = NonNullable<HOME_PAGE_QUERY_RESULT>;
type Gallery = NonNullable<Home['influence']>;
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

const setImage = (img: Element | null | undefined, image: SanityImage | null | undefined, width: number) => {
  if (!(img instanceof HTMLImageElement) || !image?.asset) return;
  const src = urlFor(image).width(width).url();
  if (img.getAttribute('src') !== src) img.src = src;
};

// A field shown as an element's text
const text = (el: Element | null | undefined, path: Path, value: Value) => {
  mark(el, path);
  setText(el, value);
};

// A button (Button.astro) and its label, which is also the text its hover
// scramble settles on (scramble.js reads data-scramble-text on each hover)
const button = (cta: Element | null | undefined, path: Path, label: Value) => {
  mark(cta, path);
  const el = cta?.querySelector('.cta__label');
  setText(el, label);
  if (el instanceof HTMLElement && label != null) el.dataset.scrambleText = label;
};

// The same parts, sizes and order as src/pages/index.astro renders
const section = (name: string) => document.querySelector(`[data-home-section="${name}"]`);

function renderHero(hero: Home['hero']) {
  const root = document.querySelector('.home-hero');
  if (!root || !hero) return;

  text(root.querySelector('.home-hero__title'), ['hero', 'headline'], hero.headline);

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

function renderLogoWall(logoWall: Home['logoWall']) {
  const eyebrow = section('logoWall')?.querySelector('.logo-wall__eyebrow');
  text(eyebrow, ['logoWall', 'label'], logoWall?.label != null ? `[ ${logoWall.label} ]` : null);
}

function renderPractice(practice: Home['practice']) {
  const root = section('practice');
  if (!root || !practice) return;
  text(root.querySelector('.tagline'), ['practice', 'label'], practice.label);
  text(root.querySelector('h2'), ['practice', 'statement'], practice.statement);
}

// Only the current slide takes the pointer (gallery.js), so only its outline
// shows over the stack; each thumbnail opens its own photo
function renderSlider(slider: Home['slider']) {
  const root = section('slider');
  if (!root || !slider) return;
  const slides = root.querySelectorAll('[data-slideshow="slide"]');
  const thumbs = root.querySelectorAll('[data-slideshow="thumb"]');
  slider.images?.forEach((image, i) => {
    const path: Path = ['slider', 'images', { _key: image._key }];
    mark(slides[i], path);
    mark(thumbs[i], path);
    setImage(slides[i]?.querySelector('img'), image, 2000);
    setImage(thumbs[i]?.querySelector('img'), image, 240);
  });
}

function renderRecognition(recognition: Home['recognition']) {
  const root = section('recognition');
  if (!root || !recognition) return;
  text(root.querySelector('.tagline'), ['recognition', 'label'], recognition.label);
  text(root.querySelector('h2'), ['recognition', 'heading'], recognition.heading);
  text(root.querySelector('.lead'), ['recognition', 'lead'], recognition.lead);
  button(root.querySelector('a.cta'), ['recognition', 'button'], recognition.button);

  const cards = root.querySelectorAll('.card');
  recognition.cards?.forEach((card, i) => {
    const path: Path = ['recognition', 'cards', { _key: card._key }];
    const image = cards[i]?.querySelector('.card-img');
    mark(image, [...path, 'image']);
    setImage(image, card.image, 1200);
    text(cards[i]?.querySelector('h3'), [...path, 'title'], card.title);
    text(cards[i]?.querySelector('p'), [...path, 'text'], card.text);
  });
}

function renderGallery(name: 'influence' | 'partners' | 'projects' | 'courses', gallery: Gallery | null) {
  const root = section(name);
  if (!root || !gallery) return;
  text(root.querySelector('h2'), [name, 'heading'], gallery.heading);
  text(root.querySelector('.lead'), [name, 'lead'], gallery.lead);
  const images = root.querySelectorAll('.gallery img');
  gallery.images?.forEach((image, i) => {
    mark(images[i], [name, 'images', { _key: image._key }]);
    setImage(images[i], image, 1200);
  });
  button(root.querySelector('a.cta'), [name, 'button'], gallery.button);
}

function renderHome(home: Home) {
  renderHero(home.hero);
  renderLogoWall(home.logoWall);
  renderPractice(home.practice);
  renderSlider(home.slider);
  renderRecognition(home.recognition);
  renderGallery('influence', home.influence);
  renderGallery('partners', home.partners);
  renderGallery('projects', home.projects);
  renderGallery('courses', home.courses);
}

// Each logo opens its client. marquee.js has cloned the row to loop it, so
// every copy is marked, each only while it still matches the clients one for
// one.
function renderLogos(clients: CLIENT_LOGOS_QUERY_RESULT) {
  section('logoWall')?.querySelectorAll('[data-marquee-collection-target]').forEach((row) => {
    const items = row.querySelectorAll('.marquee-advanced__item-width');
    if (items.length !== clients.length) return;
    clients.forEach((client, i) => {
      mark(items[i], ['logo'], { id: client._id, type: 'client' });
      const img = items[i].querySelector('img');
      if (!(img instanceof HTMLImageElement) || !client.logo?.asset) return;
      const src = urlFor(client.logo).ignoreImageParams().width(600).height(240).url();
      if (img.getAttribute('src') !== src) img.src = src;
    });
  });
}

// The same parts as src/components/GetInTouch.astro renders
function renderGetInTouch(cta: NonNullable<GET_IN_TOUCH_QUERY_RESULT>) {
  const root = document.querySelector('.final-cta');
  if (!root) return;
  text(root.querySelector('.final-cta__eyebrow'), ['getInTouch', 'label'], cta.label);
  text(root.querySelector('.final-cta__title'), ['getInTouch', 'title'], cta.title);
  const portrait = root.querySelector('.final-cta__portrait');
  mark(portrait, ['getInTouch', 'portrait']);
  setImage(portrait?.querySelector('img'), cta.portrait, 600);
  text(root.querySelector('.final-cta__lead'), ['getInTouch', 'lead'], cta.lead);
  button(root.querySelector('a.cta'), ['getInTouch', 'button'], cta.button);
}

enableVisualEditing({ zIndex: 10000 }); // above the site's own layers (400 at most)

const { createFetcherStore, enableLiveMode } = createQueryStore({ client: sanityClient, ssr: false });
enableLiveMode({ client: sanityClient });

// A live query, asked for the first time a page needs it (so the Studio's
// list of documents on a page only has the ones it shows); its latest result
// is drawn in on arrival and again on every page Barba brings in after that
function live<T>(query: string, render: (data: NonNullable<T>) => void) {
  let latest: NonNullable<T> | undefined;
  let asked = false;
  return () => {
    if (latest) render(latest);
    if (asked) return;
    asked = true;
    createFetcherStore<T>(query).subscribe(({ data }) => {
      if (data == null) return;
      latest = data;
      render(data);
    });
  };
}

const home = live<HOME_PAGE_QUERY_RESULT>(HOME_PAGE_QUERY, renderHome);
const logos = live<CLIENT_LOGOS_QUERY_RESULT>(CLIENT_LOGOS_QUERY, renderLogos);
const getInTouch = live<GET_IN_TOUCH_QUERY_RESULT>(GET_IN_TOUCH_QUERY, renderGetInTouch);

function update() {
  if (document.querySelector('.home-hero')) {
    home();
    logos();
  }
  if (document.querySelector('.final-cta')) getInTouch();
}

update();

// Barba swaps pages without a reload, bringing in the published words
const { barba } = window as unknown as { barba?: { hooks: { after: (hook: () => void) => void } } };
barba?.hooks.after(update);
