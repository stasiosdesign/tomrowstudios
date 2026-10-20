/* The pictures of the four parts' cards, chosen in one place: the closing
   cards (ServiceCards.astro) show them, and the home hero's list takes its
   Architectural Projects photograph from here too (index.astro), so the
   two always agree.

   - Architectural Projects: the cover of the first project in the Studio's
     order (the Architecture page's first), else the Home page's projects
     photograph.
   - Partners & Collabs: every client's white logo, in the logo wall's
     order, going round a ring of five places (the first five, repeating
     while there are fewer; logo-carousel.js brings the rest round).
   - Shop & Courses: the first three products with a picture, else the
     Home page's Courses photographs, as a fan.
   - Architectural Influence: a region of the Influence page's atlas
     (world-map.ts), in the plate's own units. */
import { urlFor } from '../sanity/image';
import type { CLIENT_LOGOS_QUERY_RESULT, HOME_PAGE_QUERY_RESULT, PROJECT_INDEX_QUERY_RESULT, SHOP_ITEMS_QUERY_RESULT } from '../sanity/sanity.types';

export function explorePictures(home: HOME_PAGE_QUERY_RESULT, shopItems: SHOP_ITEMS_QUERY_RESULT | null, clients: CLIENT_LOGOS_QUERY_RESULT | null, projects: PROJECT_INDEX_QUERY_RESULT | null) {
  const shopPictures = [
    ...(shopItems ?? []).map((item) => item.card?.image).filter((image) => image?.asset),
    ...(home?.courses?.images ?? []).filter((image) => image?.asset),
  ].slice(0, 3);
  const logoUrls = (clients ?? []).filter((client) => client.logo?.asset).map((client) => urlFor(client.logo!).ignoreImageParams().width(480).height(192).url());
  const orbitPlaces = logoUrls.length > 1 ? Array.from({ length: 5 }, (_, i) => logoUrls[i % logoUrls.length]) : [];
  const projectCover = (projects ?? []).find((project) => project.coverImage?.asset)?.coverImage ?? home?.projects?.images?.[0];
  return { shopPictures, logoUrls, orbitPlaces, projectCover };
}

/* The atlas's region for a landscape card: from the Caribbean to Arabia and
   from the UK down into southern Africa, framed by a search of the drawing
   itself so that barely a twentieth of what lies behind the heading is
   land. The UK stays whole at any card shape: a card wider than this crops
   only the foot (xMidYMin), where the Cape may go; a narrower one only the
   sides. Its top starts some units above the search's best (95), setting
   the drawing (the UK with it) a little lower in the card. */
export const MAP_BOX_WIDE = '260 76 752 440';
