/* Where every document stands: draft, staging (published) and live, with
   whether the live copy matches what is on staging.

     npx sanity exec scripts/live-status.ts --with-user-token */
import {getCliClient} from 'sanity/cli'
import type {SanityDocument} from 'sanity'
import {isLiveId, publishedId, sameContent} from '../lib/live'

const client = getCliClient({apiVersion: '2025-02-19'})

async function main() {
  const docs = await client
    .withConfig({perspective: 'raw'})
    .fetch<SanityDocument[]>(`*[!(_type match "system.*") && !(_type match "sanity.*")] | order(_type asc, _id asc)`)
  const groups = new Map<string, {type: string; draft?: SanityDocument; published?: SanityDocument; live?: SanityDocument}>()
  for (const doc of docs) {
    const id = publishedId(doc._id)
    const group = groups.get(id) ?? {type: doc._type}
    if (doc._id.startsWith('drafts.')) group.draft = doc
    else if (isLiveId(doc._id)) group.live = doc
    else group.published = doc
    groups.set(id, group)
  }
  const pad = (text: string, width: number) => text.padEnd(width)
  console.log(`${pad('id', 40)} ${pad('type', 14)} ${pad('draft', 6)} ${pad('staging', 8)} live`)
  for (const [id, {type, draft, published, live}] of [...groups].sort(([, a], [, b]) => a.type.localeCompare(b.type))) {
    const liveState = !live ? '-' : !published ? 'live (nothing on staging)' : sameContent(published, live) ? 'live, current' : 'live, BEHIND staging'
    console.log(`${pad(id, 40)} ${pad(type, 14)} ${pad(draft ? 'yes' : '-', 6)} ${pad(published ? 'yes' : '-', 8)} ${liveState}`)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
