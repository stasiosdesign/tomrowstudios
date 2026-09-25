/* Every GROQ query the site runs. Sanity TypeGen reads this file (see
   typegen in the Studio's sanity.cli.ts) and writes each query's result type
   to sanity.types.ts beside it, so after changing a query or the schema, run
   `npm run typegen` in the Studio.

   Every query takes $live (src/sanity/content.ts): true on production, which
   reads the live copies (live-<id>) alone; false on staging and in
   development, which read the published documents (and drafts in draft
   mode). Pass contentParams with every fetch. */
import { defineQuery } from 'groq';

// What the image helper needs: the asset's dimensions, and the editor's crop
// and hotspot, which the URL builder applies.
const IMAGE_ASSET = `asset->{ _id, metadata { dimensions { width, height } } }, crop, hotspot`;
const IMAGE = `${IMAGE_ASSET}, alt`;

// One side of the dataset: the live copies on production, everything else off it
const SIDE = `string::startsWith(_id, "live-") == $live`;

// Projects in their Architecture-page order: the slider on that page, the
// project pages to build, and each page's next project (the one after it,
// wrapping round at the end, as the hand-written pages did).
export const PROJECT_INDEX_QUERY = defineQuery(`*[_type == "project" && ${SIDE} && defined(slug.current)] | order(sortOrder asc, _createdAt asc) {
  _id,
  "name": coalesce(shortTitle, title),
  "slug": slug.current,
  context,
  year,
  coverImage { ${IMAGE} }
}`);

// One project, with everything its page renders.
export const PROJECT_PAGE_QUERY = defineQuery(`*[_type == "project" && ${SIDE} && slug.current == $slug][0] {
  _id,
  title,
  "name": coalesce(shortTitle, title),
  "slug": slug.current,
  context,
  year,
  lead,
  credits[]{ _key, name, note, kind },
  "portfolioUrl": coalesce(portfolio.asset->url, portfolioUrl),
  content[]{
    _key,
    _type,
    _type == "featureImage" => { ${IMAGE} },
    _type == "imageGallery" => { layout, framing, images[]{ _key, ${IMAGE} } },
    _type == "textSection" => { label, body }
  }
}`);

// The home page's client logo wall.
export const CLIENT_LOGOS_QUERY = defineQuery(`*[_type == "client" && ${SIDE} && defined(logo.asset)] | order(sortOrder asc, name asc) {
  _id,
  name,
  logo { ${IMAGE_ASSET} }
}`);

// One of the home page's four photo bands
const HOME_GALLERY = `heading, lead, images[]{ _key, ${IMAGE} }, button`;

// The home page, section by section, from the one Home page document (its
// live copy on production). The logos in its logo wall are
// CLIENT_LOGOS_QUERY; the Get in touch block that closes it is
// GET_IN_TOUCH_QUERY, as on every other page that ends with it.
export const HOME_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-homePage", "homePage")][0] {
  hero {
    headline,
    slides[]{ _key, caption, photo { ${IMAGE_ASSET} }, background { ${IMAGE_ASSET} } },
    primaryButton,
    secondaryButton
  },
  logoWall { label },
  practice { label, statement },
  slider { images[]{ _key, ${IMAGE} } },
  recognition { label, heading, lead, button, cards[]{ _key, title, text, image { ${IMAGE} } } },
  influence { ${HOME_GALLERY} },
  partners { ${HOME_GALLERY} },
  projects { ${HOME_GALLERY} },
  courses { ${HOME_GALLERY} }
}`);

// The closing Get in touch block, the same on every page that ends with it:
// one copy, kept in the Home page document.
export const GET_IN_TOUCH_QUERY = defineQuery(`*[_id == select($live => "live-homePage", "homePage")][0].getInTouch {
  label,
  title,
  portrait { ${IMAGE} },
  lead,
  button
}`);

// The other static pages, one document each (their live copies on
// production), holding what their code once fixed: labels, headings,
// standfirsts, the main pictures and the words on buttons. Everything else on
// them stays in src/pages/*.astro, which fall back to the same words
// (src/sanity/page-defaults.ts) for any field that is empty.
export const ARCHITECTURE_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-architecturePage", "architecturePage")][0] {
  header { label, heading }
}`);

export const INFLUENCE_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-influencePage", "influencePage")][0] {
  hero { label, heading, lead, image { ${IMAGE} } },
  reach { label, number, text },
  approach { label, statement },
  origins { label, heading },
  insights { label, heading, lead },
  atlas { label, heading },
  book { label, heading, lead, button }
}`);

export const SHOP_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-shopPage", "shopPage")][0] {
  hero { label, heading, lead, image { ${IMAGE} }, primaryButton, secondaryButton },
  catalogue { label, heading },
  testimonials { heading, lead },
  faq { label, heading, note, helpHeading, helpLead, helpButton }
}`);

export const BOOK_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-bookPage", "bookPage")][0] {
  header { image { ${IMAGE} }, heading, lead },
  overview { heading, image { ${IMAGE} } },
  inside { heading },
  atlas { caption, primaryButton, secondaryButton }
}`);

// The three product pages share one shape: a header and two parts of a write-up
const COURSE_PAGE = `header { image { ${IMAGE} }, heading, lead },
  overview { heading, image { ${IMAGE} } },
  details { heading, image { ${IMAGE} } }`;

export const PRODUCT_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-productPage", "productPage")][0] {
  ${COURSE_PAGE}
}`);

export const COURSE_COMMUNICATION_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-courseCommunicationPage", "courseCommunicationPage")][0] {
  ${COURSE_PAGE}
}`);

export const COURSE_SKETCHBOOK_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-courseSketchbookPage", "courseSketchbookPage")][0] {
  ${COURSE_PAGE}
}`);

export const PARTNERS_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-partnersPage", "partnersPage")][0] {
  intro { heading, lead, button },
  clients { label, heading, note },
  statement { heading, image { ${IMAGE} }, lead, button },
  services { label, lead },
  results { label, heading, note },
  enquire { label, heading, lead }
}`);

export const PARTNERS_ARCHIVE_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-partnersArchivePage", "partnersArchivePage")][0] {
  intro { heading, lead }
}`);

export const PRIVACY_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-privacyPage", "privacyPage")][0] {
  header { heading },
  body
}`);

export const TERMS_PAGE_QUERY = defineQuery(`*[_id == select($live => "live-termsPage", "termsPage")][0] {
  header { heading },
  body
}`);

// Any one page document, whole, for the Visual editor's live drafts
// (src/sanity/live-preview.ts): the page names its document, and each part
// names the field it shows.
export const PAGE_LIVE_QUERY = defineQuery(`*[_id == $id][0]`);
