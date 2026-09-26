/* Every GROQ query the site runs. Sanity TypeGen reads this file (see
   typegen in the Studio's sanity.cli.ts) and writes each query's result type
   to sanity.types.ts beside it, so after changing a query or the schema, run
   `npm run typegen` in the Studio.

   Which dataset a query reads is the client's business (src/sanity/client.ts):
   staging reads the staging dataset, production the production dataset. */
import { defineQuery } from 'groq';

// What the image helper needs: the asset's dimensions, and the editor's crop
// and hotspot, which the URL builder applies.
const IMAGE_ASSET = `asset->{ _id, metadata { dimensions { width, height } } }, crop, hotspot`;
const IMAGE = `${IMAGE_ASSET}, alt`;


// Projects in their Architecture-page order: the slider on that page, the
// project pages to build, and each page's next project (the one after it,
// wrapping round at the end, as the hand-written pages did).
export const PROJECT_INDEX_QUERY = defineQuery(`*[_type == "project" && defined(slug.current)] | order(sortOrder asc, _createdAt asc) {
  _id,
  "name": coalesce(shortTitle, title),
  "slug": slug.current,
  context,
  year,
  coverImage { ${IMAGE} }
}`);

// One project, with everything its page renders.
export const PROJECT_PAGE_QUERY = defineQuery(`*[_type == "project" && slug.current == $slug][0] {
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

// The shop's items in their grid order: the cards on the Shop page, the
// item pages to build, and each page's "Related" row (the other items).
export const SHOP_ITEMS_QUERY = defineQuery(`*[_type == "shopItem" && defined(slug.current)] | order(sortOrder asc, title asc) {
  _id,
  title,
  "slug": slug.current,
  sortOrder,
  card { image { ${IMAGE} }, kind, meta, text, button }
}`);

// One shop item, with everything its page renders.
export const SHOP_ITEM_QUERY = defineQuery(`*[_type == "shopItem" && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  header { image { ${IMAGE} }, lead, tags },
  details {
    metaRows[]{ _key, label, value },
    cta { rowLabel, label, href, opensContact }
  },
  overview { heading, body, image { ${IMAGE} } },
  whatYouGet { heading, body, modules[]{ _key, name, text }, image { ${IMAGE} } },
  atlas {
    image { ${IMAGE} },
    caption,
    primaryButton { label, href },
    secondaryButton { label, href }
  }
}`);

// The home page's client logo wall: the clients chosen in the Home page's
// logo wall, in that order, or every client by sortOrder while none are
// chosen. Either way only clients with a logo.
const CLIENT_LOGO = `_id, name, logo { ${IMAGE_ASSET} }`;
export const CLIENT_LOGOS_QUERY = defineQuery(`select(
  count(*[_id == "homePage"][0].logoWall.clients) > 0 =>
    (*[_id == "homePage"][0].logoWall.clients[]-> { ${CLIENT_LOGO} })[defined(logo.asset)],
  *[_type == "client" && defined(logo.asset)] | order(sortOrder asc, name asc) { ${CLIENT_LOGO} }
)`);

// One of the home page's four photo bands
const HOME_GALLERY = `heading, lead, images[]{ _key, ${IMAGE} }, button`;

// The home page, section by section, from the one Home page document (its
// live copy on production). The logos in its logo wall are
// CLIENT_LOGOS_QUERY; the Get in touch block that closes it is
// GET_IN_TOUCH_QUERY, as on every other page that ends with it.
export const HOME_PAGE_QUERY = defineQuery(`*[_id == "homePage"][0] {
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
export const GET_IN_TOUCH_QUERY = defineQuery(`*[_id == "homePage"][0].getInTouch {
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
export const ARCHITECTURE_PAGE_QUERY = defineQuery(`*[_id == "architecturePage"][0] {
  header { label, heading }
}`);

export const INFLUENCE_PAGE_QUERY = defineQuery(`*[_id == "influencePage"][0] {
  hero { label, heading, lead, image { ${IMAGE} } },
  reach { label, number, text },
  approach { label, statement },
  origins { label, heading },
  insights { label, heading, lead },
  atlas { label, heading },
  book { label, heading, lead, button }
}`);

export const SHOP_PAGE_QUERY = defineQuery(`*[_id == "shopPage"][0] {
  hero { label, heading, lead, image { ${IMAGE} }, primaryButton, secondaryButton },
  catalogue { label, heading },
  testimonials { heading, lead },
  faq { label, heading, note, helpHeading, helpLead, helpButton }
}`);

export const PARTNERS_PAGE_QUERY = defineQuery(`*[_id == "partnersPage"][0] {
  intro { heading, lead, button },
  clients { label, heading, note },
  statement { heading, image { ${IMAGE} }, lead, button },
  services { label, lead },
  results { label, heading, note },
  enquire { label, heading, lead },
  archive { heading, lead }
}`);

export const PRIVACY_PAGE_QUERY = defineQuery(`*[_id == "privacyPage"][0] {
  header { heading },
  body
}`);

export const TERMS_PAGE_QUERY = defineQuery(`*[_id == "termsPage"][0] {
  header { heading },
  body
}`);

// Any one page document, whole, for the Visual editor's live drafts
// (src/sanity/live-preview.ts): the page names its document, and each part
// names the field it shows.
export const PAGE_LIVE_QUERY = defineQuery(`*[_id == $id][0]`);

// The partners, in their slider order: a slide on the Partners page, a
// picture in the Partners archive grid and, when one has a case study, the
// drawer both open; a logo, when set, for the Partners page's marquee.
export const PARTNERS_QUERY = defineQuery(`*[_type == "partner" && defined(slug.current)] | order(sortOrder asc, name asc) {
  _id,
  name,
  "slug": slug.current,
  logo { ${IMAGE_ASSET} },
  coverImage { ${IMAGE} },
  caseStudy {
    title,
    standfirst,
    facts { client, date, services, output, website },
    body,
    image { ${IMAGE} },
    filmsHeading,
    filmsLead,
    gallery[]{ _key, ${IMAGE} }
  }
}`);
