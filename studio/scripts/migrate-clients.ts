/* Puts every client into the Home page's logo wall, once: the new "Logos"
   field (logoWall.clients, a list of references) on the homePage document in
   the staging dataset, and on its draft if there is one, in the order the
   wall showed them before (sortOrder, then name). setIfMissing: a document
   that already has the list keeps it.

   From studio/:
     npx sanity exec scripts/migrate-clients.ts --with-user-token */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'}).withConfig({dataset: 'staging'})

async function main() {
  const clientIds: string[] = await client.fetch(
    '*[_type == "client" && !(_id in path("drafts.**"))] | order(sortOrder asc, name asc)._id',
  )
  if (!clientIds.length) {
    console.log('no clients to list')
    return
  }
  const clients = clientIds.map((id, i) => ({
    _type: 'reference',
    _key: `client-${(i + 1).toString().padStart(2, '0')}`,
    _ref: id,
  }))

  const ids = ['homePage', 'drafts.homePage']
  const existing: string[] = await client.fetch('*[_id in $ids]._id', {ids})
  if (!existing.length) {
    console.log('no homePage document to patch')
    return
  }

  const transaction = client.transaction()
  for (const id of existing) {
    transaction.patch(id, (patch) => patch.setIfMissing({'logoWall.clients': clients}))
  }
  await transaction.commit()
  for (const id of existing) console.log(`patched ${id}: logoWall.clients, ${clients.length} clients (if missing)`)
}

main().catch((error: Error) => {
  console.error('ERR', error.message)
  process.exit(1)
})
