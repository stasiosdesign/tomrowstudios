/* Where the site's enquiry forms send an enquiry: the contact form in the
   floating navigation (FloatingNav.astro, checked and sent by enquiry.js),
   where every "contact Tom" on the site now leads, and the Partner page's
   (partner.astro, formvalidation.js). The contact side panel's form
   (ContactPanel.astro) is wired the same way but no longer opened.

   The site has no server of its own on production (a static build), so an
   enquiry needs somewhere to go: a form service that takes a POST and
   emails it on (Formspree, Basin, Getform and the like give each form an
   address), or a function of your own. Paste that address here; one
   address takes both forms, each sending its own fields as form data (a
   service that keeps forms apart wants one address each: give the Partner
   page's form its own constant then). They ask for JSON back; only a
   successful answer (2xx) counts as sent.

   Until it is set, a form says plainly that nothing was sent and offers
   the enquiry as an email instead. */

/** The form endpoint, e.g. https://formspree.io/f/xxxxxxxx */
export const CONTACT_ENDPOINT = '';
