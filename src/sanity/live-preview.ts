/* Visual editing in the Studio's Presentation tool, for the home page hero.

   Loaded only when the page is open in a frame (see BaseLayout.astro), so
   visitors never download it. With a Studio as the parent it:
   - connects the click-to-edit outlines (enableVisualEditing);
   - asks the Studio for the hero in live mode (enableLiveMode): the Studio
     runs the query with the editor's own login, drafts included, and sends
     every change as it is typed, so the page needs no token and no server;
   - marks the hero's parts with data-sanity attributes and writes the drafts
     into them, and again whenever Barba brings the home page back.
   The static page underneath stays the published one. */
import { createQueryStore } from '@sanity/core-loader';
import { createDataAttribute, enableVisualEditing } from '@sanity/visual-editing-standalone';
import { sanityClient } from './client';
import { urlFor, type SanityImage } from './image';
import { HOME_HERO_QUERY } from './queries';
import type { HOME_HERO_QUERY_RESULT } from './sanity.types';

type Hero = NonNullable<HOME_HERO_QUERY_RESULT>;
type Path = Parameters<typeof createDataAttribute>[0]['path'];

// The Studio framing this page; its outlines open documents there
const studioUrl = (() => {
  try {
    return new URL(document.referrer).origin;
  } catch {
    return 'https://tomrowstudios.sanity.studio';
  }
})();

const mark = (el: Element | null | undefined, path: Path) => {
  if (el instanceof HTMLElement) {
    el.dataset.sanity = createDataAttribute({ baseUrl: studioUrl, id: 'homePage', type: 'homePage', path }).toString();
  }
};

const setText = (el: Element | null | undefined, text: string | null | undefined) => {
  if (el && text != null && el.textContent !== text) el.textContent = text;
};

const setImage = (img: Element | null | undefined, image: SanityImage | null | undefined, width: number) => {
  if (!(img instanceof HTMLImageElement) || !image?.asset) return;
  const src = urlFor(image).width(width).url();
  if (img.getAttribute('src') !== src) img.src = src;
};

// The same parts, sizes and order as src/pages/index.astro renders
function render(hero: Hero) {
  const root = document.querySelector('.home-hero');
  if (!root) return;

  const headline = root.querySelector('.home-hero__title');
  mark(headline, ['hero', 'headline']);
  setText(headline, hero.headline);

  const captions = root.querySelectorAll('[data-hero-dial-caption]');
  const photos = root.querySelectorAll('[data-hero-dial-mask-item]');
  const backgrounds = root.querySelectorAll('[data-hero-slide-bg]');
  hero.slides?.forEach((slide, i) => {
    const path: Path = ['hero', 'slides', { _key: slide._key }];
    mark(captions[i], path);
    mark(photos[i], path);
    setText(captions[i], slide.caption);
    setImage(photos[i]?.querySelector('img'), slide.photo, 800);
    setImage(backgrounds[i]?.querySelector('img'), slide.background, 2500);
  });

  const [primary, secondary] = root.querySelectorAll('.home-hero__copy a.cta');
  mark(primary, ['hero', 'primaryButton']);
  mark(secondary, ['hero', 'secondaryButton']);
  setText(primary?.querySelector('.cta__label'), hero.primaryButton);
  setText(secondary?.querySelector('.cta__label'), hero.secondaryButton);
}

enableVisualEditing({ zIndex: 10000 }); // above the site's own layers (400 at most)

const { createFetcherStore, enableLiveMode } = createQueryStore({ client: sanityClient, ssr: false });
enableLiveMode({ client: sanityClient });

let latest: Hero | undefined;
createFetcherStore<HOME_HERO_QUERY_RESULT>(HOME_HERO_QUERY).subscribe(({ data }) => {
  if (!data) return;
  latest = data;
  render(data);
});

// Barba swaps pages without a reload, bringing back the published hero
const { barba } = window as unknown as { barba?: { hooks: { after: (hook: () => void) => void } } };
barba?.hooks.after(() => {
  if (latest) render(latest);
});
