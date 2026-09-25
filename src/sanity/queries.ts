/* Every GROQ query the site runs. Sanity TypeGen reads this file (see
   typegen in the Studio's sanity.cli.ts) and writes each query's result type
   to sanity.types.ts beside it, so after changing a query or the schema, run
   `npm run typegen` in the Studio. */
import { defineQuery } from 'groq';

// What the image helper needs: the asset's dimensions, and the editor's crop
// and hotspot, which the URL builder applies.
const IMAGE_ASSET = `asset->{ _id, metadata { dimensions { width, height } } }, crop, hotspot`;
const IMAGE = `${IMAGE_ASSET}, alt`;

// Projects in their Architecture-page order: the slider on that page.
export const PROJECT_INDEX_QUERY = defineQuery(`*[_type == "project" && defined(slug.current)] | order(sortOrder asc, _createdAt asc) {
  _id,
  "name": coalesce(shortTitle, title),
  "slug": slug.current,
  context,
  year,
  coverImage { ${IMAGE} }
}`);

// The same projects in the same order, with everything a project page renders.
// One query builds every page; each page's next project is the one after it,
// wrapping round at the end, as the hand-written pages did.
export const PROJECT_PAGES_QUERY = defineQuery(`*[_type == "project" && defined(slug.current)] | order(sortOrder asc, _createdAt asc) {
  _id,
  title,
  "name": coalesce(shortTitle, title),
  "slug": slug.current,
  context,
  year,
  lead,
  credits[]{ _key, name, note, kind },
  "portfolioUrl": coalesce(portfolio.asset->url, portfolioUrl),
  coverImage { ${IMAGE} },
  content[]{
    _key,
    _type,
    _type == "featureImage" => { ${IMAGE} },
    _type == "imageGallery" => { layout, framing, images[]{ _key, ${IMAGE} } },
    _type == "textSection" => { label, body }
  }
}`);

// The home page's client logo wall.
export const CLIENT_LOGOS_QUERY = defineQuery(`*[_type == "client" && defined(logo.asset)] | order(sortOrder asc, name asc) {
  _id,
  name,
  logo { ${IMAGE_ASSET} }
}`);

// The home page hero: the headline, the dial's five slides and the two button
// labels, from the one Home page document.
export const HOME_HERO_QUERY = defineQuery(`*[_id == "homePage"][0].hero {
  headline,
  slides[]{ _key, caption, photo { ${IMAGE_ASSET} }, background { ${IMAGE_ASSET} } },
  primaryButton,
  secondaryButton
}`);
