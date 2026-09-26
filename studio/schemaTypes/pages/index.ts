import {architecturePage} from './architecture'
import {influencePage} from './influence'
import {partnersPage} from './partners'
import {privacyPage} from './privacy'
import {shopPage} from './shop'
import {termsPage} from './terms'

// The site's static pages, one document each (the home page's is
// documents/home-page.ts). Each holds the few words and pictures its page's
// code no longer fixes; the site falls back to the same words
// (src/sanity/page-defaults.ts) while a field is empty. The shop's items
// are not pages but a collection (documents/shop-item.ts).

export type PageEntry = {type: string; title: string; route: string}

/** Every static page, in the site's navigation order; the home page first. Each is a singleton whose _id is its type. */
export const PAGES: PageEntry[] = [
  {type: 'homePage', title: 'Home', route: '/'},
  {type: 'architecturePage', title: 'Architecture', route: '/architecture'},
  {type: 'influencePage', title: 'Influence', route: '/influence'},
  {type: 'partnersPage', title: 'Partners', route: '/partner'},
  {type: 'shopPage', title: 'Shop', route: '/shop'},
  {type: 'privacyPage', title: 'Privacy', route: '/privacy'},
  {type: 'termsPage', title: 'Terms', route: '/terms'},
]

/** The page document types, the home page's aside (it is in documents/). */
export const pageTypes = [
  architecturePage,
  influencePage,
  partnersPage,
  shopPage,
  privacyPage,
  termsPage,
]
