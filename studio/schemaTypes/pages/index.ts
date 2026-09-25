import {architecturePage} from './architecture'
import {bookPage} from './book'
import {courseCommunicationPage} from './course-communication'
import {courseSketchbookPage} from './course-sketchbook'
import {influencePage} from './influence'
import {partnersArchivePage} from './partners-archive'
import {partnersPage} from './partners'
import {privacyPage} from './privacy'
import {productPage} from './product'
import {shopPage} from './shop'
import {termsPage} from './terms'

// The site's static pages, one document each (the home page's is
// documents/home-page.ts). Each holds the few words and pictures its page's
// code no longer fixes; the site falls back to the same words
// (src/sanity/page-defaults.ts) while a field is empty.

export type PageEntry = {type: string; title: string; route: string}

/** Every static page, in the site's navigation order; the home page first. Each is a singleton whose _id is its type. */
export const PAGES: PageEntry[] = [
  {type: 'homePage', title: 'Home', route: '/'},
  {type: 'architecturePage', title: 'Architecture', route: '/architecture'},
  {type: 'influencePage', title: 'Influence', route: '/influence'},
  {type: 'partnersPage', title: 'Partners', route: '/partner'},
  {type: 'partnersArchivePage', title: 'Partners archive', route: '/partners-archive'},
  {type: 'shopPage', title: 'Shop', route: '/shop'},
  {type: 'productPage', title: 'Masterclass', route: '/product'},
  {type: 'courseCommunicationPage', title: 'Communication package', route: '/course-communication'},
  {type: 'courseSketchbookPage', title: 'Digital Sketchbook', route: '/course-sketchbook'},
  {type: 'bookPage', title: 'Book', route: '/book'},
  {type: 'privacyPage', title: 'Privacy', route: '/privacy'},
  {type: 'termsPage', title: 'Terms', route: '/terms'},
]

/** The page document types, the home page's aside (it is in documents/). */
export const pageTypes = [
  architecturePage,
  influencePage,
  partnersPage,
  partnersArchivePage,
  shopPage,
  productPage,
  courseCommunicationPage,
  courseSketchbookPage,
  bookPage,
  privacyPage,
  termsPage,
]
