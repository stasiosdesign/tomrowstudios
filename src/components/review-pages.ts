/* The site's pages for the review layer's page filter (review-comments.ts),
   read from the routes in src/pages at build time rather than listed by
   hand: each static page's address, its Barba namespace (which the notes
   in design-notes.ts name their page by) and its name, as BaseLayout is
   given it. Pages made from content ([slug].astro) are left out; a comment
   made on one names its page itself. The five in the navigation come
   first, in its order (site-links.ts), the rest after them by name. Server
   only. */
import { pages as navigation } from './site-links';

export interface ReviewPage {
  path: string;
  namespace: string;
  name: string;
}

const sources = import.meta.glob<string>('../pages/**/*.astro', { query: '?raw', import: 'default', eager: true });

const attribute = (source: string, name: string) => source.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

export function reviewPages(): ReviewPage[] {
  const found = Object.entries(sources)
    .filter(([file]) => !file.includes('['))
    .map(([file, source]) => {
      const route = file.replace(/^\.\.\/pages/, '').replace(/\.astro$/, '').replace(/\/index$/, '') || '/';
      return {
        path: route,
        namespace: attribute(source, 'namespace') ?? route.slice(1),
        name: attribute(source, 'pageName') ?? route,
        title: attribute(source, 'title')?.split(' — ')[0],
      };
    });
  // Two pages under one name (a preview beside its page): each by its title instead
  const pages = found.map(({ title, ...page }) => ({
    ...page,
    name: found.filter((other) => other.name === page.name).length > 1 && title ? title : page.name,
  }));
  const rank = (path: string) => {
    const index = navigation.findIndex((link) => link.href === path);
    return index < 0 ? navigation.length : index;
  };
  return pages.sort((a, b) => rank(a.path) - rank(b.path) || a.name.localeCompare(b.name));
}
