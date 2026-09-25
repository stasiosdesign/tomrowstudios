/* Gives every published document a live copy: the one-off step that moves
   the site to live copies (lib/live.ts), and a way to release everything on
   staging at once afterwards.

     npx sanity exec scripts/publish-all-live.ts --with-user-token            missing copies only
     npx sanity exec scripts/publish-all-live.ts --with-user-token -- --all   every published document

   Without --all a document that already has a live copy is left as it is,
   so the script is safe to run again. Drafts are never touched. */
import {getCliClient} from 'sanity/cli'
import type {SanityDocument} from 'sanity'
import {liveId, sameContent, toLiveCopy} from '../lib/live'

const client = getCliClient({apiVersion: '2025-02-19'})
const all = process.argv.includes('--all')

async function main() {
  const {published, live} = await client.fetch<{published: SanityDocument[]; live: SanityDocument[]}>(`{
    "published": *[!(_id in path("drafts.**")) && !(_id in path("live.*")) && !(_type match "system.*") && !(_type match "sanity.*")],
    "live": *[_id in path("live.*")]
  }`)
  const liveById = new Map(live.map((doc) => [doc._id, doc]))
  let created = 0
  let replaced = 0
  let kept = 0
  const transaction = client.transaction()
  for (const doc of published) {
    const existing = liveById.get(liveId(doc._id))
    if (existing && (!all || sameContent(doc, existing))) {
      kept++
      continue
    }
    transaction.createOrReplace(toLiveCopy(doc))
    if (existing) replaced++
    else created++
    console.log(`${existing ? 'replace' : 'create '}  ${liveId(doc._id)}  (${doc._type})`)
  }
  if (created + replaced > 0) await transaction.commit()
  console.log(`\n${created} live ${created === 1 ? 'copy' : 'copies'} created, ${replaced} replaced, ${kept} already current.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
