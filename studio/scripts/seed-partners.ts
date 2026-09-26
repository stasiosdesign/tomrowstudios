/* Makes the Partner documents in the staging dataset, once, from the twelve
   slides the Partners page (src/pages/partner.astro) was built with: a
   partner for each, in the slider's order, and, since every slide opened the
   same Rayon case study, that case study on each of them, as the page showed
   it. Every picture is uploaded from public/ first; Sanity keeps one copy of
   identical files, so running this again uploads nothing new.

   It also gives the Partners page document (and its draft, if there is one)
   the words of the Partners archive page, which moved into it (its "archive"
   section): setIfMissing, so words already there stay.

   It never overwrites: a partner that already exists is left exactly as it
   is ("kept"). To redo one, delete it in the Studio first.

   From studio/:
     npx sanity exec scripts/seed-partners.ts --with-user-token */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {PAGE_DEFAULTS} from '../../src/sanity/page-defaults'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({dataset: 'staging'})

// The script runs from studio/ (sanity exec needs its sanity.cli.ts), so the
// site's public/ is one level up
const publicDir = path.resolve(process.cwd(), '..', 'public')

// The slides, in the slider's order: the name and the picture each showed
const PARTNERS: {name: string; slug: string; image: string}[] = [
  {name: 'Intel', slug: 'intel', image: '/assets/photos/talks/talk-13.jpg'},
  {name: 'Epic Games', slug: 'epic-games', image: '/assets/photos/talks/talk-14.jpg'},
  {name: 'Speckle', slug: 'speckle', image: '/assets/photos/talks/talk-15.jpg'},
  {name: 'D5 Render', slug: 'd5-render', image: '/assets/photos/talks/talk-17.jpg'},
  {name: 'Gendo', slug: 'gendo', image: '/assets/photos/talks/talk-16.jpg'},
  {name: 'Material Bank', slug: 'material-bank', image: '/assets/photos/events/event-09.jpg'},
  {name: 'Qonic', slug: 'qonic', image: '/assets/photos/events/event-10.jpg'},
  {name: 'Motif', slug: 'motif', image: '/assets/photos/events/event-11.jpg'},
  {name: 'Giraffe', slug: 'giraffe', image: '/assets/photos/events/event-12.jpg'},
  {name: 'Finch', slug: 'finch', image: '/assets/photos/studio/studio-03.jpg'},
  {name: 'Krea', slug: 'krea', image: '/assets/photos/talks/talk-18.jpg'},
  {name: 'Architypes', slug: 'architypes', image: '/assets/photos/events/event-13.jpg'},
]

// The one case study every slide opened
const CASE_STUDY = {
  title: 'Rayon tutorials',
  standfirst:
    'A series of tutorial films and product walkthroughs showing how architects use Rayon to draw, share and collaborate on real projects.',
  facts: {
    client: 'Rayon Design',
    date: 'October 2024',
    services: 'Planning, direction, production, edit',
    output: 'Six tutorial films',
    website: 'https://www.rayon.design',
  },
  paragraphs: [
    'Rayon needed a way to show architects and interior designers exactly how the software works — not through feature lists, but through real demonstration. Tom planned the tutorial structure around one workflow per film: drawing a floor plan, sharing a file, building a library of details.',
    'Filming took place in working studios rather than a showroom, so the software is seen where it is actually used. The edit strips anything that does not serve the lesson — no music, no slow pans, just the interface and the steps to follow.',
  ],
  image: '/assets/photos/thumbnails/thumb-03.jpg',
  filmsHeading: 'The films',
  filmsLead: 'Six tutorials, each built around one workflow an architect actually has to get through',
  gallery: [
    '/assets/photos/events/event-15.jpg',
    '/assets/photos/events/event-16.jpg',
    '/assets/photos/events/event-01.jpg',
    '/assets/photos/studio/studio-09.jpg',
    '/assets/photos/studio/studio-10.jpg',
    '/assets/photos/events/event-14.jpg',
  ],
}

// A key for an array item: Sanity wants one on each, unique in its array
let keys = 0
const key = () => `k${(keys += 1).toString(36).padStart(6, '0')}`

const uploaded = new Map<string, string>()
async function uploadImage(publicPath: string, alt?: string) {
  let assetId = uploaded.get(publicPath)
  if (!assetId) {
    const file = path.join(publicDir, publicPath)
    const asset = await client.assets.upload('image', fs.createReadStream(file), {
      filename: path.basename(file),
    })
    assetId = asset._id
    uploaded.set(publicPath, assetId)
  }
  return {
    _type: 'image',
    asset: {_type: 'reference', _ref: assetId},
    ...(alt ? {alt} : {}),
  }
}

const paragraph = (text: string) => ({
  _type: 'block',
  _key: key(),
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: key(), text, marks: []}],
})

async function caseStudy() {
  const gallery = []
  for (const image of CASE_STUDY.gallery) gallery.push({_key: key(), ...(await uploadImage(image))})
  return {
    title: CASE_STUDY.title,
    standfirst: CASE_STUDY.standfirst,
    facts: CASE_STUDY.facts,
    body: CASE_STUDY.paragraphs.map(paragraph),
    image: await uploadImage(CASE_STUDY.image),
    filmsHeading: CASE_STUDY.filmsHeading,
    filmsLead: CASE_STUDY.filmsLead,
    gallery,
  }
}

async function seedPartners() {
  const ids = PARTNERS.map((partner) => `partner-${partner.slug}`)
  const existing: string[] = await client.fetch('*[_id in $ids]._id', {ids})

  const transaction = client.transaction()
  let created = 0
  for (const [i, partner] of PARTNERS.entries()) {
    const id = ids[i]
    if (existing.includes(id)) {
      console.log(`kept ${id}`)
      continue
    }
    transaction.createIfNotExists({
      _id: id,
      _type: 'partner',
      name: partner.name,
      slug: {_type: 'slug', current: partner.slug},
      sortOrder: i + 1,
      coverImage: await uploadImage(partner.image, `Case study — ${partner.name}`),
      caseStudy: await caseStudy(),
    })
    created += 1
    console.log(`created ${id}, order ${i + 1}`)
  }
  if (created) await transaction.commit()
}

// The archive page's words, now the Partners page's own "archive" section
async function seedArchiveSection() {
  const ids = ['partnersPage', 'drafts.partnersPage']
  const existing: string[] = await client.fetch('*[_id in $ids]._id', {ids})
  if (!existing.length) {
    console.log('no partnersPage yet: seed it with seed-pages.ts, which includes the archive section')
    return
  }
  const transaction = client.transaction()
  for (const id of existing) {
    transaction.patch(id, (patch) => patch.setIfMissing({archive: PAGE_DEFAULTS.partnersPage.archive}))
  }
  await transaction.commit()
  for (const id of existing) console.log(`patched ${id}: archive section (if missing)`)
}

async function main() {
  await seedPartners()
  await seedArchiveSection()
}

main().catch((error: Error) => {
  console.error('ERR', error.message)
  process.exit(1)
})
