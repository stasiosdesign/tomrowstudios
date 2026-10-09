/* Puts the Shop page's FAQ questions into its document, once, from the five
   the page was built with (FAQ_DEFAULTS in src/sanity/page-defaults.ts, at
   the repository root), keys and all, so the page editor lists the same
   questions the site shows: the Shop page in the staging dataset, and its
   draft if it has one. The live site shows the same five until the Shop page
   is next published live.

   It never overwrites: a document that already has questions is left
   exactly as it is ("kept").

   From studio/:
     npx sanity exec scripts/seed-shop-faq.ts --with-user-token */
import {getCliClient} from 'sanity/cli'
import {FAQ_DEFAULTS} from '../../src/sanity/page-defaults'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({dataset: 'staging'})

const questions = FAQ_DEFAULTS.map((item) => ({_type: 'faqItem', ...item}))

for (const id of ['shopPage', 'drafts.shopPage']) {
  const doc = await client.getDocument<{faq?: {questions?: unknown[]}}>(id)
  if (!doc) {
    console.log(`${id}: not there, skipped`)
    continue
  }
  if (doc.faq?.questions?.length) {
    console.log(`${id}: has questions, kept`)
    continue
  }
  await client.patch(id).setIfMissing({faq: {}}).set({'faq.questions': questions}).commit()
  console.log(`${id}: ${questions.length} questions added`)
}
